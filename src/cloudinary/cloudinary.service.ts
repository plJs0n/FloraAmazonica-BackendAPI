import { Injectable, OnModuleInit, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { v2 as cloudinary } from 'cloudinary';

@Injectable()
export class CloudinaryService implements OnModuleInit {
  constructor(private configService: ConfigService) {}

  onModuleInit() {
    cloudinary.config({
      cloud_name: this.configService.get<string>('CLOUDINARY_CLOUD_NAME'),
      api_key: this.configService.get<string>('CLOUDINARY_API_KEY'),
      api_secret: this.configService.get<string>('CLOUDINARY_API_SECRET'),
    });
  }

  async uploadImage(
    fileBuffer: Buffer,
    folder: string,
    publicId?: string,
  ): Promise<{ url: string; public_id: string }> {
    return new Promise((resolve, reject) => {
      const uploadOptions: any = {
        folder: this.configService.get<string>('CLOUDINARY_FOLDER', 'flora-amazonica') + '/' + folder,
        resource_type: 'image',
      };

      if (publicId) {
        uploadOptions.public_id = publicId;
      }

      cloudinary.uploader
        .upload_stream(uploadOptions, (error, result) => {
          if (error) {
            reject(new BadRequestException(`Error al subir imagen: ${error.message}`));
          } else {
            resolve({
              url: result.secure_url,
              public_id: result.public_id,
            });
          }
        })
        .end(fileBuffer);
    });
  }

  async deleteImage(publicId: string): Promise<void> {
    await cloudinary.uploader.destroy(publicId);
  }
}
