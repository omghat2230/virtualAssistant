import express from "express"
import { askToAssistant, getCurruntUser, updateAssistant } from "../controllers/userController.js"
import isAuth from "../middlewares/isAuth.js"
import upload from "../middlewares/multer.js"
const userRouter = express.Router()


userRouter.get("/current",isAuth,getCurruntUser)
userRouter.post('/update',isAuth,upload.single("AssistantImage"),updateAssistant)
userRouter.post('/asktoassistant',isAuth,askToAssistant)

export default userRouter

