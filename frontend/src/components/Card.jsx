
import { UserDataContext } from '../context/UserContext'
import React, { useContext } from 'react'

const Card = ({ image }) => {

    const {
        serverUrl,
        UserData,
        setUserData,
        backendImage,
        setBackendImage,
        frontendImage,
        setFrontendImage,
        selectedImage,
        setSelectedImage
    } = useContext(UserDataContext)
    
     
    return (
        <div
            className={`w-40 h-60 bg-[#030326] lg:w-50 lg:60  border-2 border-[#020118] rounded-2xl overflow-hidden hover:shadow-2xl hover:shadow-blue-950 cursor-pointer hover:border-4 hover:border-white
            
            ${selectedImage==image?"border-4 border-white shadow-2xl shadow-blue-950 ": null}`}
            onClick={() => {setSelectedImage(image)
              setBackendImage(null)
              setFrontendImage(null)
            }}
        >
            <img
                src={image}
                className="h-full w-full object-cover"
            />
        </div>
    )
}

export default Card

