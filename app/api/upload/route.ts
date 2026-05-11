import { NextResponse } from 'next/server';
import { v2 as cloudinary } from 'cloudinary';

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME || 'dulc67tpt',
  api_key: process.env.CLOUDINARY_API_KEY || '818534591882393',
  api_secret: process.env.CLOUDINARY_API_SECRET || 'XsJGp78_Fy8u8Vq9biqEZx_DdWU',
});

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get('image') as File;
    if (!file) return NextResponse.json({ error: 'No image provided' }, { status: 400 });

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    return new Promise((resolve) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        { folder: 'dropshipping', resource_type: 'image' },
        (error, result) => {
          if (error) resolve(NextResponse.json({ error: error.message }, { status: 500 }));
          else resolve(NextResponse.json({ url: result!.secure_url, public_id: result!.public_id }));
        }
      );
      uploadStream.end(buffer);
    });
  } catch {
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { public_id } = await request.json();
    await cloudinary.uploader.destroy(public_id);
    return NextResponse.json({ message: 'Deleted' });
  } catch {
    return NextResponse.json({ error: 'Delete failed' }, { status: 500 });
  }
}
