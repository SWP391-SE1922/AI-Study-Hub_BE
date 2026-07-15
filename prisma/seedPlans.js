const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {

    const plans = [

        {
            code: "PRO10",
            name: "Pro 10GB",
            price: 29000,
            storageLimit: 10 * 1024 * 1024 * 1024,
            dailyChatLimit: 40,
            durationDays: 30,
            description: "10GB lưu trữ và 40 lượt AI mỗi ngày",
            isActive: true
        },

        {
            code: "PRO50",
            name: "Pro 50GB",
            price: 79000,
            storageLimit: 50 * 1024 * 1024 * 1024,
            dailyChatLimit: 100,
            durationDays: 30,
            description: "50GB lưu trữ và 100 lượt AI mỗi ngày",
            isActive: true
        },

        {
            code: "PREMIUM",
            name: "Premium 200GB",
            price: 199000,
            storageLimit: 200 * 1024 * 1024 * 1024,
            dailyChatLimit: 300,
            durationDays: 30,
            description: "200GB lưu trữ và 300 lượt AI mỗi ngày",
            isActive: true
        }

    ];

    for (const plan of plans) {

        await prisma.subscriptionPlan.upsert({

            where: {
                code: plan.code
            },

            update: plan,

            create: plan

        });

    }

    console.log("Seed thành công");

}

main()
    .catch(console.error)
    .finally(async () => {

        await prisma.$disconnect();

    });