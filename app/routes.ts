import { type RouteConfig, index, route } from "@react-router/dev/routes";

export default [
  index("routes/home.tsx"),
  route("signup", "routes/signup.tsx"),
  route("login", "routes/login.tsx"),
  route("logout", "routes/logout.tsx"),
  route("chat/:slug", "routes/chat.$slug.tsx"),
  route("api/chat", "routes/api.chat.tsx"),
] satisfies RouteConfig;
