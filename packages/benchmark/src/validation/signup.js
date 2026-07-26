import fs from "node:fs";
import axios from "axios";

const _value = {
    ciphertext:
        "jx-WoIQOew3d3oYx18CqKHZQGzfFGGhIxwoick8ivbs29-CC3QASz1DFSGhkcEiNS_NTd-vOD8IFhjelIf5fIGm2H6-IJPgiqFTZVc9VwXycD5_X4SwNH37svXpgl6tOLiRhLYAF9cirwC0-pyXyn7K6uhiUcEVKndZPiMj1oNqENtOiXXOYA1X9htsbH9fC2wI2C4ma7HTT2Y0IHiB27a-VhMtMvh271cATa5gSNGdy-LOiU3gegKbeBPEORyhNOOXCW112zFyQ_Nfe1eIR1a7H83JXsvYaLqNeiQhQIet8nCiO8gHu7gkl323jSK5ByO3ILJ_1JXNLsI5BwQPM1jRE2uecdZ2wBI8JFkbLwk73qGgrGBQLxpbODgWCnwAt3H47hSOGX-Qj_xxFES79l5aP5qzuN0siobzL-QktAcDdVckRd5aU7PGQvtu7ZnO8yor8NMqRMVR6N2x-vkZ1oTf0ItPKyOJ9hv4HOPoFofZZ8VDpr_FovdnSYx08Das6WgJV0pAR0h2TfZriWAx1_oUk-YfRLgMGaE18P5zD84dJLDg4zPP2n02-Ak8u41GntgO54Jb01wTwu5gMUAXL-qdBZLNnUfTkMh-1cHiHuwQDYrAAhnSsHHJv-Lw1fXVF2_QAzFaKqKQPWbNBuIr_97r1NJMNykqVZvL3Z05QIb4jV-Fx6WZ5bSIIM1E_V-U0YuEtfOxdrRUaza6rzcYbGQcvKP4aNhZyv7bLYyhZhe5-6h0uizAUUJaMyPyGggVSC5yvox1_YSgUGKboiYFungdMcpN36vRIgA",
    nonce: "1-4b2_fvZ7Iu5AOT2b3iwcx-M6tUGtZI",
};

const BASE_URL = "http://localhost:3003/api/v1/validator";
const TOTAL_VALIDATORS = 100;

const tokens = [];

async function signup(email) {
    try {
        const res = await axios.post(`${BASE_URL}/sign`, {
            email,
        });
        return res.data.token;
    } catch (err) {
        if (err.response?.status === 409) {
        } else {
            console.error(email, err.response?.data || err.message);
        }
    }
}

(async () => {
    for (let i = 1; i <= TOTAL_VALIDATORS; i++) {
        const email = `validator${i}@example.com`;

        const token = await signup(email);

        if (token) {
            tokens.push(token);
        }
    }

    fs.writeFileSync("tokens.json", JSON.stringify(tokens, null, 2));
})();
