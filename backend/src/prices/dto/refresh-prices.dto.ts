import { ArrayMinSize, ArrayUnique, IsArray, IsIn, IsOptional } from 'class-validator';
import { Tienda, TIENDAS } from '../../python-client/scrape.types';

export class RefreshPricesDto {
  /** Tiendas a actualizar. Si se omite, se actualizan todas. */
  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @ArrayUnique()
  @IsIn(TIENDAS, { each: true })
  tiendas?: Tienda[];
}
