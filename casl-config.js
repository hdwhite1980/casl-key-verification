window.CASL_CONFIG = {
  api: {
    baseUrl: "https://2mez9qoyt6.execute-api.us-east-2.amazonaws.com/prod",
    endpoints: {
      userCheck: "/user-check",
      verify: "/verify",
      history: "/verification-history",
      packages: "/packages",
      login: "/login",
      register: "/register",
      status: "/status"
    }
  },
  auth: {
    region: "us-east-2",
    userPoolId: "us-east-2_wxVzxzC7V",
    userPoolWebClientId: "6eihn0891v31dsovg33g2e1h90"
  },
  storage: {
    cdnBaseUrl: "https://d3hf6lqvkzgyx8.cloudfront.net"
  },
  app: {
    name: "CASL Key Verification System",
    version: "1.0.0",
    environment: "production"
  }
};
