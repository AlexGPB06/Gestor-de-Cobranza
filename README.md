# Gestor de Cobranza

SaaS multiempresa de **gestión de cobranza**: carteras de clientes en mora, gestiones telefónicas, promesas de pago, bonificaciones, tickets, metas por equipo y auditoría, con roles de **admin**, **supervisor** y **gestor**. Ecosistema: **Spring Boot 4 + Java 25** (API REST + JWT) · **React 19 + Vite + Tailwind** (SPA) · **MySQL 8** · **Docker Compose + nginx** (proxy inverso) · **AWS EC2** (demo) · **GitHub Pages** (frontend estático) · **SonarCloud** (calidad).

## Arquitectura

```
┌──────────────────────────────────────────────────────┐
│  nginx (contenedor frontend, puerto 80)              │
│  ├─ /        → SPA React (dist)                     │
│  └─ /api/*   → proxy_pass → backend:8080            │
└───────────────────────┬──────────────────────────────┘
                        │ red interna de compose
                        ▼
┌──────────────────────────┐      ┌────────────────────┐
│  backend (Spring Boot)   │◄────►│  db (MySQL 8)      │
│  ├─ JWT + roles          │      │  saas_cobranza_db  │
│  ├─ interceptor de acceso│      │  semillas al       │
│  └─ semillas de datos    │      │  arrancar          │
└──────────────────────────┘      └────────────────────┘

Demo EC2:   http://54.156.249.149          (misma imagen docker)
Pages:      https://alexgpb06.github.io/Gestor-de-Cobranza/
            └─ API HTTPS → https://54-156-249-149.nip.io (Caddy en la EC2)
```

- Todo pasa por **nginx**: el navegador solo habla con un mismo origen (evita CORS en local y en EC2).
- En **GitHub Pages** la SPA vive en otro origen, así que la API se expone por **HTTPS** con un contenedor **Caddy** (certificado Let's Encrypt vía `nip.io`) y el frontend se construye con `VITE_API_URL` apuntando a esa liga.

## Requisitos

- [Docker](https://docs.docker.com/get-docker/) con Docker Compose (**recomendado** — no necesitas nada más).
- Solo para desarrollo sin Docker: **JDK 25**, **Node 24** y acceso a un **MySQL 8**.

## Correr el programa (Docker)

```bash
git clone https://github.com/AlexGPB06/Gestor-de-Cobranza.git
cd Gestor-de-Cobranza
docker compose up -d --build
```

Abre **http://localhost** y entra con las credenciales de abajo. Datos de prueba (empresas, campañas, clientes en mora, gestores) se siembran solos al arrancar.

Útiles:

```bash
docker compose ps                 # estado de los contenedores
docker compose logs -f backend    # logs de la API
docker compose down               # apagar (los datos persisten en el volumen)
```

> El perfil `aws` (`--profile aws`) solo se usa en la EC2: levanta además **Caddy** en el puerto 443 para el HTTPS de GitHub Pages.

## Credenciales

| Usuario | Contraseña | Rol |
|---|---|---|
| `admin` | `Operativo123` | Administrador |
| `gestor.s1.01` | `Operativo123` | Gestor |
| `supervisor.s1` | `Operativo123` | Supervisor |

## Desarrollo local (sin Docker)

**1. MySQL** (si no tienes uno corriendo en el puerto 3306):

```bash
docker run --name mysql-dev -e MYSQL_ROOT_PASSWORD=Password123 \
  -e MYSQL_DATABASE=saas_cobranza_db -p 3306:3306 -d mysql:8.0
```

**2. Backend** (con semillas, en la raíz del repo):

```bash
# Linux / macOS
cd saas-cobranza && ./mvnw spring-boot:run \
  -Dspring-boot.run.arguments="--saas.cobranza.semillas=true"

# Windows
cd saas-cobranza
.\mvnw.cmd spring-boot:run "-Dspring-boot.run.arguments=--saas.cobranza.semillas=true"
```

Queda en `http://localhost:8080`.

**3. Frontend** (otra terminal):

```bash
cd frontend-cobranza
npm ci
npm run dev
```

Abre **http://localhost:5173** — Vite hace de proxy de `/api` hacia el backend en el puerto 8080.

## Tests

```bash
# Backend — 254 tests (JUnit + Mockito) + cobertura JaCoCo ≥ 80%
cd saas-cobranza
./mvnw.cmd verify          # reporte: target/site/jacoco/index.html

# Frontend — 511 tests (Jest) + lint
cd frontend-cobranza
npm run lint
npm test                   # 511 tests
npm run test:coverage      # cobertura ≈ 98%
```

Calidad continua en **SonarCloud**: <https://sonarcloud.io/project/overview?id=AlexGPB06_Gestor-de-Cobranza> (Quality Gate en `A`, duplicación ≈ 2%). El workflow `.github/workflows/ci-cd.yml` corre tests, build Docker y análisis en cada push.

## Despliegue

**AWS EC2 (demo principal)** — la imagen es la misma del Compose; en la instancia:

```bash
cd ~/Gestor-de-Cobranza
git pull
sudo docker compose build backend frontend
sudo docker compose --profile aws up -d
```

- Demo: **http://54.156.249.149** (Elastic IP, puertos 80/443 abiertos en el security group).

**GitHub Pages (frontend estático)** — el workflow `.github/workflows/pages.yml` compila y publica en cada push a `main` (requiere *Settings → Pages → Source: GitHub Actions*):

- **https://alexgpb06.github.io/Gestor-de-Cobranza/**

## Estructura

```
docker-compose.yml        Orquestación: db + backend + frontend (+ caddy con --profile aws)
Dockerfile.backend        Imagen Java 25 (usuario no-root)
Dockerfile.frontend       Build de Vite + nginx (usuario no-root)
deploy/nginx.conf         Proxy inverso: / → SPA, /api/* → backend
deploy/Caddyfile          HTTPS (Let's Encrypt) para el API en la EC2
.github/workflows/        ci-cd.yml (tests+Docker+Sonar+ZAP) y pages.yml (GitHub Pages)

saas-cobranza/
  src/main/java/.../config/       Seguridad, CORS, interceptor de roles (ConfigAcceso)
  src/main/java/.../controller/   API REST (/api/...)
  src/main/java/.../service/      Lógica de negocio (gestiones, carteras, promesas...)
  src/main/java/.../repository/   JPA sobre MySQL
  src/main/java/.../DataSeeder.java  Semillas: usuarios, campañas, clientes demo

frontend-cobranza/
  src/App.jsx             Login + menú por rol + rutas
  src/apiClient.js        Axios: token JWT, baseURL de la API, cierre de sesión en 401
  src/components/         Cartera, gestión, promesas, tickets, metas, auditoría...
  tests/                  511 tests (Jest + Testing Library)
```
