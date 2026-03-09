import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { HttpExceptionFactory } from '../errors/http-exception-factory.class';
import { I18nContext } from 'nestjs-i18n';
import { FastifyReply, FastifyRequest } from 'fastify';
import { PageNotFoundException } from 'src/errors/exceptions/page-not-found.exception';

@Catch(HttpException)
export class HttpExceptionFactoryFilter implements ExceptionFilter {
  private logger = new Logger(HttpExceptionFactoryFilter.name);

  catch(exception: HttpExceptionFactory, host: ArgumentsHost) {
    if (['development', 'test'].includes(process.env.NODE_ENV || '')) {
      if (!(exception instanceof PageNotFoundException)) {
        this.logger.error(exception);
      }
    }

    const ctx = host.switchToHttp();
    const response = ctx.getResponse<FastifyReply>();
    const request = ctx.getRequest<FastifyRequest>();
    const status = exception.getStatus();

    const i18n = I18nContext.current(host);

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
      path: request.url,
      code,
      message,
    };

    if (exception?.errorDetails?.additionalDataHandler && i18n) {
      Object.assign(responseData, {
        data: exception.errorDetails.additionalDataHandler(i18n) as unknown,
      });
    }

    response.status(status).send(responseData);
  }
}

/**
 * Http exception factory error filter
 * return status, timestamp, path, code (error code), message (error message)
 */
