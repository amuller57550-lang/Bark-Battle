import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('users')
@UseGuards(JwtAuthGuard)
export class UsersController {
  constructor(private users: UsersService) {}

  @Get(':id')
  getProfile(@Param('id') id: string) {
    return this.users.findById(id);
  }

  @Get(':id/stats')
  getStats(@Param('id') id: string) {
    return this.users.getStats(id);
  }
}
