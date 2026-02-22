import { Router } from "express";

const router: Router = Router();

interface RouterInterface {
    path: string;
    router: Router;
}

const AllRouter: RouterInterface[] = [];

AllRouter.forEach((x) => {
    router.use(x.path, x.router);
});

export default router;
