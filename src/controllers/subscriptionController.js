const prisma = require('../config/database');
const asyncHandler = require('../utils/asyncHandler');
const { sendSuccess } = require('../utils/response');

const getPlans = asyncHandler(async (req, res) => {
    const plans = await prisma.subscriptionPlan.findMany({
        where: {
            isActive: true
        },
        orderBy: {
            price: 'asc'
        }
    });

    return sendSuccess(
        res,
        "Lấy danh sách gói thành công",
        { plans },
        null,
        200
    );
});

const getCurrentSubscription = asyncHandler(async (req, res) => {

    const userId = req.user.id;

    const subscription = await prisma.userSubscription.findFirst({

        where: {

            userId,

            status: "ACTIVE",

            expireDate: {

                gt: new Date()

            }

        },

        include: {

            plan: true

        }

    });

    return sendSuccess(
        res,
        "Lấy subscription thành công",
        { subscription },
        null,
        200
    );

});

module.exports = {

    getPlans,
    getCurrentSubscription

};