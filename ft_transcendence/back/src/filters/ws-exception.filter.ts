import {
  ArgumentsHost,
  Catch,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { WsException } from '@nestjs/websockets';
import { I18nContext } from 'nestjs-i18n';
import { Socket } from 'socket.io';
import { HttpExceptionFactory } from 'src/errors/http-exception-factory.class';

@Catch(WsException, HttpExceptionFactory, HttpException)
export class WsExceptionFilter {
  public catch(exception: HttpException, host: ArgumentsHost) {
    const client = host.switchToWs().getClient<Socket>();
    this.handleError(client, exception, host);
  }

  public handleError(
    client: Socket,
    exception: HttpExceptionFactory | HttpException | WsException,
    host: ArgumentsHost,
  ) {
    if (exception instanceof HttpExceptionFactory) {
      const i18n = I18nContext.current(host);

      const status = exception.getStatus();

      const code =
        exception.errorDetails?.code ||
        HttpStatus[status as unknown as keyof typeof HttpStatus] ||
        'INTERNAL_SERVER_ERROR';

      const message = (() => {
        if (!i18n) {
          return 'undefined';
        }
        try {
          return i18n.t(
            `exceptions.messages.${code}`,
            exception.errorDetails?.exceptionFilter || undefined,
          );
        } catch {
          return 'undefined';
        }
      })();

      const responseData = {
        status,
        timestamp: new Date().toISOString(),
        code,
        message,
      };
      client.send(responseData);
    } else if (exception instanceof HttpException) {
      // handle http exception
      console.log(exception);
      client.send('HTTP ERROR'); // TODO
    } else {
      client.send('UNKNOWN_ERROR');
    }
  }
}
