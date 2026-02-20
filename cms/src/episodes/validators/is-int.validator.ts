import { Transform } from 'class-transformer';
import { applyDecorators } from '@nestjs/common';
import { IsInt, Min } from 'class-validator';

export function IsIntFormData(min?: number) {
    return applyDecorators(
        Transform(({ value }) => {
            if (value === undefined || value === null || value === '') return value;
            const parsed = parseInt(value, 10);
            return isNaN(parsed) ? value : parsed;
        }),
        IsInt(),
        ...(min !== undefined ? [Min(min)] : []),
    );
}