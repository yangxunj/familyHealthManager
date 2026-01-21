import { Injectable, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';

export interface UploadedFile {
  url: string;
  name: string;
  originalName: string;
  size: number;
  mimeType: string;
}

@Injectable()
export class StorageService {
  private readonly uploadDir: string;
  private readonly maxFileSize = 10 * 1024 * 1024; // 10MB
  private readonly allowedMimeTypes = [
    'image/jpeg',
    'image/png',
    'image/gif',
    'application/pdf',
  ];

  constructor(private configService: ConfigService) {
    this.uploadDir = path.join(process.cwd(), 'uploads');
    this.ensureUploadDir();
  }

  private ensureUploadDir() {
    if (!fs.existsSync(this.uploadDir)) {
      fs.mkdirSync(this.uploadDir, { recursive: true });
    }
  }

  private ensureUserDir(userId: string): string {
    const userDir = path.join(this.uploadDir, 'documents', userId);
    if (!fs.existsSync(userDir)) {
      fs.mkdirSync(userDir, { recursive: true });
    }
    return userDir;
  }

  validateFile(file: Express.Multer.File): void {
    if (!file) {
      throw new BadRequestException('请选择要上传的文件');
    }

    if (file.size > this.maxFileSize) {
      throw new BadRequestException('文件大小不能超过 10MB');
    }

    if (!this.allowedMimeTypes.includes(file.mimetype)) {
      throw new BadRequestException('只支持 JPG、PNG、GIF 和 PDF 格式的文件');
    }
  }

  async saveFile(file: Express.Multer.File, userId: string): Promise<UploadedFile> {
    this.validateFile(file);

    const userDir = this.ensureUserDir(userId);
    const ext = path.extname(file.originalname);
    const fileName = `${uuidv4()}${ext}`;
    const filePath = path.join(userDir, fileName);

    // 写入文件
    fs.writeFileSync(filePath, file.buffer);

    return {
      url: `/uploads/documents/${userId}/${fileName}`,
      name: fileName,
      originalName: file.originalname,
      size: file.size,
      mimeType: file.mimetype,
    };
  }

  async saveFiles(files: Express.Multer.File[], userId: string): Promise<UploadedFile[]> {
    const results: UploadedFile[] = [];

    for (const file of files) {
      const result = await this.saveFile(file, userId);
      results.push(result);
    }

    return results;
  }

  async deleteFile(fileUrl: string): Promise<void> {
    const filePath = path.join(process.cwd(), fileUrl);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  }

  async deleteFiles(fileUrls: string[]): Promise<void> {
    for (const url of fileUrls) {
      await this.deleteFile(url);
    }
  }
}
