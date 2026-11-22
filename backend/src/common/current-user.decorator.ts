import { createParamDecorator, ExecutionContext } from '@nestjs/common';

/** Id del usuario autenticado (lo deja `JwtStrategy.validate` en `request.user`). */
export const UsuarioActual = createParamDecorator((_data: unknown, contexto: ExecutionContext) => {
  const request = contexto.switchToHttp().getRequest<{ user: { userId: string } }>();
  return request.user.userId;
});
