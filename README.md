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

## Clientes demo (cartera del gestor)

Al arrancar con semillas se siembran **10 clientes en mora**, ya asignados a la cartera de `gestor.s1.01`. Entra con ese usuario y abre el menú **👥 Mi Cartera** para visualizarlos; también se buscan por número de cuenta en **🗂️ Info/Gestión** (ej. `TDC-DEMO-001`).

| Cuenta | RFC | Cliente | Correo | Teléfono | Saldo pendiente |
|---|---|---|---|---|---|
| `TDC-DEMO-001` | `RFC-DEMO-001` | Ana Luisa Robles | cliente.demo.001@correo.com | 5540000001 | $13,125.00 |
| `TDC-DEMO-002` | `RFC-DEMO-002` | Carlos Mendoza Ruiz | cliente.demo.002@correo.com | 5540000002 | $15,000.00 |
| `TDC-DEMO-003` | `RFC-DEMO-003` | Patricia Herrera | cliente.demo.003@correo.com | 5540000003 | $16,875.00 |
| `TDC-DEMO-004` | `RFC-DEMO-004` | Jorge Delgado Cruz | cliente.demo.004@correo.com | 5540000004 | $18,750.00 |
| `TDC-DEMO-005` | `RFC-DEMO-005` | Mariana Solís Vega | cliente.demo.005@correo.com | 5540000005 | $20,625.00 |
| `TDC-DEMO-006` | `RFC-DEMO-006` | Héctor Iván Palacios | cliente.demo.006@correo.com | 5540000006 | $22,500.00 |
| `TDC-DEMO-007` | `RFC-DEMO-007` | Fernanda Cortés Nava | cliente.demo.007@correo.com | 5540000007 | $24,375.00 |
| `TDC-DEMO-008` | `RFC-DEMO-008` | Rodrigo Amaya León | cliente.demo.008@correo.com | 5540000008 | $26,250.00 |
| `TDC-DEMO-009` | `RFC-DEMO-009` | Silvia Elena Fuentes | cliente.demo.009@correo.com | 5540000009 | $28,125.00 |
| `TDC-DEMO-010` | `RFC-DEMO-010` | Omar Bustos Paredes | cliente.demo.010@correo.com | 5540000010 | $30,000.00 |

## Alta de usuarios (admin)

1. Entra como `admin` → menú **👥 Gestión de Empleados** → sección **Alta de Personal**.
2. Llena el formulario: **Nombre Completo**\*, **Correo Electrónico**\*, **Número de Empleado**\* (exactamente 5 caracteres alfanuméricos, ej. `S1G02`), **Empresa de Pertenencia**, **Rol en el Sistema**\* (`ADMIN`, `SUPERVISOR`, `GESTOR` o `USUARIO`) y **Supervisor** (opcional, número de empleado).
3. Pulsa **Registrar Empleado** (`POST /api/empleados`). La cuenta queda **inactiva**, todavía sin usuario ni contraseña, y el sistema devuelve el número de empleado: entrégaselo a la persona.
4. El nuevo usuario abre la pantalla de login y selecciona la pestaña **Primer Ingreso** (`POST /api/empleados/activar`): ingresa su **código de empleado**, el **usuario** que desee y una **contraseña de 8 o más caracteres**, y pulsa **Activar mi Cuenta**.
5. Listo: ya puede iniciar sesión con ese usuario y contraseña.

> En la misma vista el admin puede dar de baja, cambiar el rol o reasignar la campaña de un empleado existente.

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
