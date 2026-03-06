import {
  Controller,
  Post,
  Get,
  Delete,
  Param,
  Body,
  Query,
  Res,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
  UseInterceptors,
  UploadedFile,
  UploadedFiles,
  BadRequestException,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiTags,
  ApiOperation,
  ApiConsumes,
  ApiBody,
} from '@nestjs/swagger';
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
import type { Response } from 'express';
import { MediaService } from './media.service';
import { UploadMediaDto } from './dto/upload-media.dto';
import { QueryMediaDto } from './dto/query-media.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Media')
@ApiBearerAuth()
@Controller('media')
export class MediaController {
  constructor(private readonly mediaService: MediaService) {}

  @Post('upload')
  @ApiOperation({ summary: 'Upload a single file' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: { type: 'string', format: 'binary' },
        category: { type: 'string', example: 'avatar' },
      },
      required: ['file'],
    },
  })
  @UseInterceptors(FileInterceptor('file', { storage: undefined }))
  uploadFile(
    @UploadedFile() file: Express.Multer.File,
    @Body() uploadMediaDto: UploadMediaDto,
    @CurrentUser() user: any,
  ) {
    if (!file) {
      throw new BadRequestException('File is required');
    }
    return this.mediaService.uploadFile(file, user.id, uploadMediaDto.category);
  }

  @Post('upload-multiple')
  @ApiOperation({ summary: 'Upload multiple files (max 10)' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        files: {
          type: 'array',
          items: { type: 'string', format: 'binary' },
        },
        category: { type: 'string', example: 'gallery' },
      },
      required: ['files'],
    },
  })
  @UseInterceptors(FilesInterceptor('files', 10, { storage: undefined }))
  uploadFiles(
    @UploadedFiles() files: Express.Multer.File[],
    @Body() uploadMediaDto: UploadMediaDto,
    @CurrentUser() user: any,
  ) {
    if (!files || files.length === 0) {
      throw new BadRequestException('At least one file is required');
    }
    return this.mediaService.uploadFiles(
      files,
      user.id,
      uploadMediaDto.category,
    );
  }

  @Get()
  @ApiOperation({ summary: 'List current user media (paginated)' })
  findAll(@Query() queryDto: QueryMediaDto, @CurrentUser() user: any) {
    return this.mediaService.findAllByUser(user.id, queryDto);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get media metadata by ID' })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.mediaService.findOne(id);
  }

  @Get(':id/download')
  @ApiOperation({ summary: 'Download/serve media file' })
  async download(
    @Param('id', ParseUUIDPipe) id: string,
    @Res() res: Response,
  ) {
    const { buffer, media } = await this.mediaService.getFileBuffer(id);
    res.set({
      'Content-Type': media.mimeType,
      'Content-Disposition': `inline; filename="${media.originalName}"`,
    });
    res.send(buffer);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete media' })
  remove(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: any) {
    return this.mediaService.remove(id, user.id, user.role);
  }
}
