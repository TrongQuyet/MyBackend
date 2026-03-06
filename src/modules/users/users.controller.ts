import {
  Controller,
  Get,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
  UseInterceptors,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags, ApiOperation } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { UpdateUserDto } from './dto/update-user.dto';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { HttpCacheInterceptor } from '../../common/interceptors/http-cache.interceptor';
import { CacheInvalidationInterceptor } from '../../common/interceptors/cache-invalidation.interceptor';
import { CacheTTL } from '../../common/decorators/cache-ttl.decorator';
import { CacheInvalidate } from '../../common/decorators/cache-invalidate.decorator';
import { AuditInterceptor } from '../../common/interceptors/audit.interceptor';
import { Audit } from '../../common/decorators/audit.decorator';
import { AuditAction } from '../../modules/audit-log/constants/audit.constants';

@ApiTags('Users')
@ApiBearerAuth()
@Controller('users')
@UseInterceptors(HttpCacheInterceptor, CacheInvalidationInterceptor, AuditInterceptor)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @CacheTTL(60)
  @ApiOperation({ summary: 'Get all users (paginated)' })
  findAll(@Query() paginationDto: PaginationDto) {
    return this.usersService.findAll(paginationDto);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get user by ID' })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.usersService.findById(id);
  }

  @Patch(':id')
  @Audit(AuditAction.UPDATE, 'user', 'Updated user')
  @CacheInvalidate('http:*:*/users*')
  @ApiOperation({ summary: 'Update user' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateUserDto: UpdateUserDto,
  ) {
    return this.usersService.update(id, updateUserDto);
  }

  @Delete(':id')
  @Audit(AuditAction.DELETE, 'user', 'Deleted user')
  @CacheInvalidate('http:*:*/users*')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete user' })
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.usersService.remove(id);
  }
}
