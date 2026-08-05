import { BadRequestException } from '@nestjs/common';
import { memoryStorage } from 'multer';

export const multerOptions = {
  storage: memoryStorage(),

  // Các bộ lọc ở dưới giữ nguyên
  fileFilter: (req: any, file: any, cb: any) => {
    if (file.mimetype.match(/\/(jpg|jpeg|png|gif)$/)) {
      cb(null, true);
    } else {
      cb(new BadRequestException('Định dạng file không hỗ trợ!'), false);
    }
  },
  limits: {
    fileSize: 5 * 1024 * 1024,
  },
};
