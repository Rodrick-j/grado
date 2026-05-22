import { onRequestPost as __api_create_professional_js_onRequestPost } from "C:\\Users\\Rodrigo\\OneDrive\\Desktop\\grado\\functions\\api\\create-professional.js"
import { onRequest as __api_lookup_user_js_onRequest } from "C:\\Users\\Rodrigo\\OneDrive\\Desktop\\grado\\functions\\api\\lookup-user.js"

export const routes = [
    {
      routePath: "/api/create-professional",
      mountPath: "/api",
      method: "POST",
      middlewares: [],
      modules: [__api_create_professional_js_onRequestPost],
    },
  {
      routePath: "/api/lookup-user",
      mountPath: "/api",
      method: "",
      middlewares: [],
      modules: [__api_lookup_user_js_onRequest],
    },
  ]