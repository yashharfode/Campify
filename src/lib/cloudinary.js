export const uploadToCloudinary = async (file) => {
    const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
    const uploadPreset = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET;
    
    if (!cloudName || !uploadPreset) {
      throw new Error('Cloudinary credentials missing in .env.local');
    }

    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', uploadPreset);

    const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
      method: 'POST',
      body: formData,
    });

    if (!res.ok) {
      throw new Error('Failed to upload to Cloudinary');
    }

    const data = await res.json();
    return data.secure_url;
};

export const getOptimizedImageUrl = (url, ratioType = '4:3', skipTransformation = false) => {
    if (!url || !url.includes('cloudinary.com') || skipTransformation) return url;
    
    const parts = url.split('/upload/');
    if (parts.length !== 2) return url;
    
    let transformation = 'q_auto,f_auto';
    switch(ratioType) {
        case '1:1':
            transformation = 'ar_1:1,c_fill,g_auto,w_150,h_150,' + transformation;
            break;
        case '16:9':
            transformation = 'ar_16:9,c_fill,g_auto,w_800,' + transformation;
            break;
        case '4:3':
        default:
            transformation = 'ar_4:3,c_fill,g_auto,w_400,' + transformation;
            break;
    }
    
    return `${parts[0]}/upload/${transformation}/${parts[1]}`;
};
