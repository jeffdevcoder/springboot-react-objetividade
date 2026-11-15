FROM node:24-alpine AS front
WORKDIR /front
COPY frontend/package*.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build

FROM eclipse-temurin:25-jdk AS back
WORKDIR /back
COPY backend/.mvn .mvn
COPY backend/mvnw backend/pom.xml ./
RUN chmod +x mvnw && ./mvnw -q -B dependency:go-offline
COPY backend/src src
COPY --from=front /front/dist src/main/resources/static
RUN ./mvnw -q -B -DskipTests package

FROM eclipse-temurin:25-jre
LABEL org.opencontainers.image.source="https://github.com/jeffdevcoder/springboot-react-objetividade"
WORKDIR /app
COPY --from=back /back/target/objetividade-0.0.1-SNAPSHOT.jar app.jar
EXPOSE 8080
ENTRYPOINT ["java", "-jar", "app.jar"]