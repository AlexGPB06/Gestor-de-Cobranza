package com.cobranza.saas_cobranza.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.CorsRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

@Configuration
public class CorsConfig implements WebMvcConfigurer {
    @Override
    public void addCorsMappings(CorsRegistry registry) {
        registry.addMapping("/api/**")
                .allowedOrigins(
                        "http://localhost:5173",
                        "https://alexgpb06.github.io",
                        "https://54-156-249-149.nip.io")
                .allowedMethods("GET", "POST", "PUT", "DELETE", "OPTIONS");
    }
}