import { ArrayMaxSize, ArrayMinSize, IsArray, IsString } from 'class-validator';

export class CompareListingsDto {
  @IsArray()
  @ArrayMinSize(2)
  @ArrayMaxSize(4)
  @IsString({ each: true })
  listingIds!: string[];
}

