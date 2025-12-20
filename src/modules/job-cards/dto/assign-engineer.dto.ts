import { IsNotEmpty, IsUUID } from 'class-validator';

export class AssignEngineerDto {
    @IsUUID()
    @IsNotEmpty()
    engineerId: string;
}
