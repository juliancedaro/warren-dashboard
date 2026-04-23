import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.enableCors({
    origin: [
      'http://localhost:5173',
      'https://warren-dashboard-1nwa5700f-julians-projects-1c9cc617.vercel.app',
      /^https:\/\/.*\.vercel\.app$/,
    ],
    methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE'],
    credentials: true,
  })

  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
