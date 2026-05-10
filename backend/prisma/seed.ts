import {
  PrismaClient,
  UserRole,
  ZoneType,
  SpotStatus,
  ParkingRecordStatus,
} from "@prisma/client";
import * as bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 开始播种数据...");

  const hashedPassword = await bcrypt.hash("123456", 10);

  const admin = await prisma.user.upsert({
    where: { username: "admin" },
    update: {},
    create: {
      username: "admin",
      password: hashedPassword,
      role: UserRole.ADMIN,
      name: "系统管理员",
      phone: "13800138000",
      isActive: true,
    },
  });
  console.log("✅ 创建管理员用户:", admin.username);

  const attendant = await prisma.user.upsert({
    where: { username: "attendant" },
    update: {},
    create: {
      username: "attendant",
      password: hashedPassword,
      role: UserRole.PARKING_ATTENDANT,
      name: "收费员小张",
      phone: "13800138001",
      isActive: true,
    },
  });
  console.log("✅ 创建收费员用户:", attendant.username);

  const parking = await prisma.parking.upsert({
    where: { id: "parking-001" },
    update: {},
    create: {
      id: "parking-001",
      name: "阳光花园停车场",
      address: "北京市朝阳区阳光路88号",
      totalSpots: 60,
      description: "大型商业停车场，支持多种车型",
      isActive: true,
    },
  });
  console.log("✅ 创建停车场:", parking.name);

  const zones = [
    {
      id: "zone-a",
      code: "A",
      name: "A区",
      type: ZoneType.SMALL,
      spots: 25,
      firstHourRate: 5,
      subsequentRate: 3,
      description: "小型车区域",
    },
    {
      id: "zone-b",
      code: "B",
      name: "B区",
      type: ZoneType.LARGE,
      spots: 20,
      firstHourRate: 10,
      subsequentRate: 6,
      description: "大型车区域",
    },
    {
      id: "zone-c",
      code: "C",
      name: "C区",
      type: ZoneType.VIP,
      spots: 15,
      firstHourRate: 8,
      subsequentRate: 5,
      description: "VIP专属区域",
    },
  ];

  for (const zone of zones) {
    const zoneRecord = await prisma.zone.upsert({
      where: { parkingId_code: { parkingId: parking.id, code: zone.code } },
      update: {},
      create: {
        id: zone.id,
        parkingId: parking.id,
        code: zone.code,
        name: zone.name,
        totalSpots: zone.spots,
        type: zone.type,
        firstHourRate: zone.firstHourRate,
        subsequentRate: zone.subsequentRate,
        description: zone.description,
        isActive: true,
      },
    });
    console.log(`✅ 创建区域: ${zone.name}`);

    for (let i = 1; i <= zone.spots; i++) {
      const spotNumber = i;
      const spotCode = `${zone.code}-${i.toString().padStart(3, "0")}`;

      let status: SpotStatus = SpotStatus.AVAILABLE;
      if (zone.code === "A" && i <= 8) status = SpotStatus.OCCUPIED;
      if (zone.code === "B" && i <= 5) status = SpotStatus.OCCUPIED;
      if (zone.code === "C" && i <= 3) status = SpotStatus.OCCUPIED;
      if (zone.code === "A" && i === 24) status = SpotStatus.MAINTENANCE;
      if (zone.code === "B" && i === 19) status = SpotStatus.MAINTENANCE;

      await prisma.spot.upsert({
        where: { id: `spot-${zone.code}-${i}` },
        update: {},
        create: {
          id: `spot-${zone.code}-${i}`,
          zoneId: zoneRecord.id,
          code: spotCode,
          number: spotNumber,
          status: status,
        },
      });
    }
    console.log(`  → 创建 ${zone.spots} 个车位`);
  }

  const monthlyCards = [
    { plate: "京A12345", owner: "张三", phone: "13900139001", zone: "zone-a" },
    { plate: "京B67890", owner: "李四", phone: "13900139002", zone: "zone-a" },
    { plate: "京C11111", owner: "王五", phone: "13900139003", zone: "zone-a" },
    { plate: "京D22222", owner: "赵六", phone: "13900139004", zone: "zone-b" },
    { plate: "京E33333", owner: "钱七", phone: "13900139005", zone: "zone-b" },
    { plate: "京F44444", owner: "孙八", phone: "13900139006", zone: "zone-b" },
    { plate: "京G55555", owner: "周九", phone: "13900139007", zone: "zone-c" },
    { plate: "京H66666", owner: "吴十", phone: "13900139008", zone: "zone-c" },
    { plate: "京J77777", owner: "郑一", phone: "13900139009", zone: "zone-a" },
    { plate: "京K88888", owner: "王二", phone: "13900139010", zone: "zone-b" },
  ];

  const today = new Date();
  const startDate = new Date(today);
  startDate.setDate(startDate.getDate() - 15);
  const endDate = new Date(today);
  endDate.setMonth(endDate.getMonth() + 1);

  for (const card of monthlyCards) {
    await prisma.monthlyCard.upsert({
      where: { plateNumber: card.plate },
      update: {},
      create: {
        plateNumber: card.plate,
        ownerName: card.owner,
        phone: card.phone,
        zoneId: card.zone,
        startDate: startDate,
        endDate: endDate,
        fee: 300,
        isActive: true,
      },
    });
  }
  console.log("✅ 创建 10 张月卡");

  const plates = [
    "京X10001",
    "京X10002",
    "京X10003",
    "京X10004",
    "京X10005",
    "京X10006",
    "京X10007",
    "京X10008",
  ];
  const zoneASpots = await prisma.spot.findMany({
    where: { zoneId: "zone-a", status: SpotStatus.AVAILABLE },
    take: 5,
  });
  const zoneBSpots = await prisma.spot.findMany({
    where: { zoneId: "zone-b", status: SpotStatus.AVAILABLE },
    take: 2,
  });
  const zoneCSpots = await prisma.spot.findMany({
    where: { zoneId: "zone-c", status: SpotStatus.AVAILABLE },
    take: 1,
  });

  const availableSpots = [...zoneASpots, ...zoneBSpots, ...zoneCSpots];

  for (let i = 0; i < availableSpots.length && i < plates.length; i++) {
    const spot = availableSpots[i];
    const entryTime = new Date();
    entryTime.setHours(
      entryTime.getHours() - (Math.floor(Math.random() * 5) + 1),
    );

    await prisma.parkingRecord.create({
      data: {
        plateNumber: plates[i],
        spotId: spot.id,
        entryTime: entryTime,
        status: ParkingRecordStatus.PARKING,
        isMonthly: i < 2,
      },
    });

    await prisma.spot.update({
      where: { id: spot.id },
      data: { status: SpotStatus.OCCUPIED },
    });
  }
  console.log("✅ 创建 当前在场车辆记录");

  const historicalPlates = [
    "京Y20001",
    "京Y20002",
    "京Y20003",
    "京Y20004",
    "京Y20005",
    "京Y20006",
    "京Y20007",
    "京Y20008",
    "京Y20009",
    "京Y20010",
    "京Y20011",
    "京Y20012",
    "京Y20013",
    "京Y20014",
    "京Y20015",
    "京Y20016",
    "京Y20017",
    "京Y20018",
    "京Y20019",
    "京Y20020",
    "京Y20021",
    "京Y20022",
    "京Y20023",
    "京Y20024",
    "京Y20025",
    "京Y20026",
    "京Y20027",
    "京Y20028",
    "京Y20029",
    "京Y20030",
    "京Y20031",
    "京Y20032",
    "京Y20033",
    "京Y20034",
    "京Y20035",
    "京Y20036",
    "京Y20037",
    "京Y20038",
    "京Y20039",
    "京Y20040",
  ];

  const allSpots = await prisma.spot.findMany();
  const zoneA = await prisma.zone.findUnique({ where: { id: "zone-a" } });
  const zoneB = await prisma.zone.findUnique({ where: { id: "zone-b" } });
  const zoneC = await prisma.zone.findUnique({ where: { id: "zone-c" } });

  for (let i = 0; i < 42; i++) {
    const daysAgo = Math.floor(Math.random() * 7) + 1;
    const hoursParked = Math.floor(Math.random() * 12) + 1;

    const entryTime = new Date();
    entryTime.setDate(entryTime.getDate() - daysAgo);
    entryTime.setHours(Math.floor(Math.random() * 14) + 6, 0, 0, 0);

    const exitTime = new Date(entryTime);
    exitTime.setHours(exitTime.getHours() + hoursParked);

    const zoneIndex = i % 3;
    let zone, rate;
    if (zoneIndex === 0) {
      zone = zoneA;
      rate =
        hoursParked <= 1
          ? zoneA.firstHourRate
          : zoneA.firstHourRate + (hoursParked - 1) * zoneA.subsequentRate;
    } else if (zoneIndex === 1) {
      zone = zoneB;
      rate =
        hoursParked <= 1
          ? zoneB.firstHourRate
          : zoneB.firstHourRate + (hoursParked - 1) * zoneB.subsequentRate;
    } else {
      zone = zoneC;
      rate =
        hoursParked <= 1
          ? zoneC.firstHourRate
          : zoneC.firstHourRate + (hoursParked - 1) * zoneC.subsequentRate;
    }

    const zoneSpots = allSpots.filter((s) => s.zoneId === zone.id);
    const randomSpot = zoneSpots[Math.floor(Math.random() * zoneSpots.length)];

    await prisma.parkingRecord.create({
      data: {
        plateNumber: historicalPlates[i % historicalPlates.length],
        spotId: randomSpot.id,
        entryTime: entryTime,
        exitTime: exitTime,
        duration: hoursParked * 60,
        amount: rate,
        status: ParkingRecordStatus.COMPLETED,
        isMonthly: i % 5 === 0,
      },
    });
  }
  console.log("✅ 创建 42 条历史停车记录");

  console.log("\n🎉 数据播种完成!");
  console.log("\n📋 登录账号:");
  console.log("  管理员: admin / 123456");
  console.log("  收费员: attendant / 123456");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
