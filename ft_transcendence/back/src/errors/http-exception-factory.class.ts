import { HttpException } from '@nestjs/common';
import { I18nContext, TranslateOptions } from 'nestjs-i18n';

export interface ErrorInterface {
  code: string;
  exceptionFilter?: TranslateOptions;
  additionalDataHandler?: (arg0: I18nContext) => any;
}

export class HttpExceptionFactory extends HttpException {
  constructor(
    private _errorDetails: ErrorInterface,
    status: number,
  ) {
    super(_errorDetails, status);
  }

  public get errorDetails(): ErrorInterface {
    return this._errorDetails;
  }
}
