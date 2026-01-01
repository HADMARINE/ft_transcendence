import { Injectable } from '@nestjs/common';

@Injectable()
export class UtilsService {
  
  queryNullableFilter<T>(query: T): { [P in keyof T]: NonNullable<T[P]> } {
    const _isJsonObject = (d: any): d is Record<string, any> => {
      if (typeof d !== 'string') {
        try {
          d = JSON.stringify(d);
        } catch {
          return false;
        }
      }

      try {
        JSON.parse(d);
        if (d[0] !== '{') return false;
        return true;
      } catch {
        return false;
      }
    };

    const _filter = (
      query: Record<string, any> | any[] | Exclude<any, undefined | null>,
      allowDepth = -1,
      currentDepth = 0,
    ): any  => {
      if (!query) return; 

      if (Array.isArray(query)) {
        
        query = query.filter((v) => !!v); 

        if (query.length === 0) return; 

        if (allowDepth !== -1 && currentDepth > allowDepth) {
          
          return query;
        }

        const newArray: any[] = [];

        for (const element of query) {
          
          if (Array.isArray(element) || _isJsonObject(element)) {
            
            const res = _filter(element, allowDepth, currentDepth + 1);
            if (!!res) {
              newArray.push(res); 
            }
          } else {
            newArray.push(element); 
          }
        }

        if (newArray.length !== 0) {
          
          return newArray;
        }
        return;
      }

      if (_isJsonObject(query)) {
        
        query = Object.entries(query).reduce((prev: unknown, [key, value]) => {
          if (!value) return prev;
          return Object.assign({}, prev as Record<string, any>, {
            [key]: value,
          });
        }, {});

        if (allowDepth !== -1 && currentDepth > allowDepth + 1) {
          
          if (Object.keys(query).length === 0) return;
          return query;
        }

        query = Object.entries(query) 
          .reduce((prev: unknown, [key, value]) => {
            if (Array.isArray(value) || _isJsonObject(value)) {
              const newObj = _filter(value);
              if (!newObj || Object.keys(newObj).length === 0) return prev;
              return Object.assign({}, prev as Record<string, any>, {
                [key]: newObj,
              });
            }
            return Object.assign({}, prev, { [key]: value });
          }, {});

        if (Object.keys(query).length === 0) return;
        return query;
      }

      return query;
    };

    return _filter(query);
  }

  
  sortRefiner(sort?: {
    field?: string;
    order?: string;
  }): Record<string, 'asc' | 'desc'> | Record<string, never> {
    if (!sort) return {};
    if (sort.field && sort.order) {
      const orderLowerCase = sort.order.toLowerCase();
      if (['asc', 'desc'].indexOf(orderLowerCase) === -1) {
        return {};
      }
      return {
        [sort.field]: orderLowerCase as 'asc' | 'desc',
      };
    } else {
      return {};
    }
  }

  
  dateRefiner(date?: { from?: Date; to?: Date }) {
    if (!date) return;
    const returnValue: Record<string, Date> = {};

    if (date.from) {
      returnValue['$gte'] = date.from;
    }
    if (date.to) {
      returnValue['$lte'] = date.to;
    }

    return returnValue;
  }
}
