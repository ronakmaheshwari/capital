import { Router } from "express";
import eventRouter from "./event";
import organiserRouter from "./organiser";
import ticketRouter from "./ticketing";
import transactionRouter from "./transactions";
import userRouter from "./user";
import validatorRouter from "./validator";
import webhookRouter from "./webhook";

const router: Router = Router();

interface RouterInterface {
    path: string;
    router: Router;
}

const AllRouter: RouterInterface[] = [
    {
        path: "/user",
        router: userRouter,
    },
    {
        path: "/events",
        router: eventRouter,
    },
    {
        path: "/organiser",
        router: organiserRouter,
    },
    {
        path: "/tickets",
        router: ticketRouter,
    },
    {
        path: "/transactions",
        router: transactionRouter,
    },
    {
        path: "/webhook",
        router: webhookRouter,
    },
    {
        path: "/validator",
        router: validatorRouter,
    },
];

AllRouter.forEach((x) => {
    router.use(x.path, x.router);
});

export default router;
