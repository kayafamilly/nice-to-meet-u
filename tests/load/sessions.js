import http from "k6/http";
import { check } from "k6";

export const options = {
  vus: Number(__ENV.NTMY_VUS || 10),
  duration: __ENV.NTMY_DURATION || "30s",
  thresholds: {
    http_req_failed: ["rate<0.01"],
    http_req_duration: ["p(95)<500"]
  }
};

export default function () {
  const response = http.get(`${__ENV.NTMY_TARGET_URL || "http://127.0.0.1:3000"}/`);
  check(response, { "home responds 200": (value) => value.status === 200 });
}
