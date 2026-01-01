import {
  PipeTransform,
  Injectable,
  ValidationPipe,
  ArgumentMetadata,
} from '@nestjs/common';
import { ParametersInvalidException } from 'src/errors/exceptions/parameters-invalid.exception';

@Injectable()
export class WsValidationPipe extends ValidationPipe {
  
  
  
  
  
  
  
  

  
  async transform(value: unknown, metadata: ArgumentMetadata) {
    if (typeof value === 'string') {
      try {
        return JSON.parse(value) as Record<string, unknown>;
      } catch (err: unknown) {
        throw new ParametersInvalidException();
      }
    }
    return super.transform(value, metadata) as Promise<unknown>;
  }

  createExceptionFactory() {
    return (validationErrors = []) => {
      if (this.isDetailedOutputDisabled) {
        return new ParametersInvalidException();
      }

      return new ParametersInvalidException(validationErrors);
    };
  }
}
