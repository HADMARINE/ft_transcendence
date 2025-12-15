import { HttpStatus } from '@nestjs/common';
import { HttpExceptionFactory } from '../http-exception-factory.class';
import { ValidationError } from 'class-validator';

export class ParametersInvalidException extends HttpExceptionFactory {
  constructor(data?: ValidationError[]) {
    super(
      {
        code: 'PARAMETERS_INVALID',
        additionalDataHandler: (i18n) => {
          if (!data) return undefined;
          const translatedAdditionalData: Record<string, string> = {};
          for (const d of data) {
            let dataName = i18n.t(`names.data.${d.property}`);
            if (typeof dataName === 'string') {
              dataName = dataName.charAt(0).toUpperCase() + dataName.slice(1);
            }
            const message = i18n.t(`exceptions.parameter_details.data_invalid`);

            Object.assign(translatedAdditionalData, {
              [d.property]: `${dataName} ${message}`,
            });
          }
          return translatedAdditionalData;
        },
      },
      HttpStatus.BAD_REQUEST,
    );
  }
}
