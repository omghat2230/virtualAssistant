import { v2 as cloudinary } from 'cloudinary'
import fs from "fs"
import { DEFAULT_MAX_VERSION } from 'tls';

const uploadOnCloudinary = async (filePath) =>{
  cloudinary.config({ 
        cloud_name: process.env.COLOUDINARY_CLOUD_NAME, 
        api_key: process.env.COLOUDINARY_API_KEY, 
        api_secret: process.env.COLOUDINARY_API_SECRET // Click 'View API Keys' above to copy your API secret
    });

    try {
       const uploadResult = await cloudinary.uploader
       .upload(filePath)
       fs.unlinkSync
       return uploadResult.secure_url
    } catch (error) {
      fs.unlinkSync(filePath)
      return res.status(500).json({message:"cloudinary error"})
    }

}

export default uploadOnCloudinary