import { PipeTransform, Injectable } from '@nestjs/common';
import { ParametersInvalidException } from 'src/errors/exceptions/parameters-invalid.exception';

@Injectable()
export class ParseJsonPipe implements PipeTransform {
  transform(value: unknown) {
    if (typeof value === 'string') {
      try {
        return JSON.parse(value) as Record<string, unknown>;
      } catch (err: unknown) {
        throw new ParametersInvalidException();
      }
    }
    return value; // already an object
  }
}
