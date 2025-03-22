import { PrismaClient, RiLink } from '@prisma/client'

const prisma = new PrismaClient()

const createRepoItem = async (
  miId: string,
  name: string,
  riId1?: string,
  miLink1?: string,
  riId2?: string,
  miLink2?: string,
) => {

  const ri = await prisma.repoItem.create({ data: {} })

  const riVer = await prisma.riVer.create({
    data: {
      riId: ri.id,
      miId,
      name,
    }
  })

  let riLink1: RiLink | undefined,
    riLink2: RiLink | undefined

  if (riId1 && miLink1) {
    riLink1 = await prisma.riLink.create({
      data: {
        miLinkId: miLink1,
        riId1,
        riId2: ri.id,
      }
    })

    if (riId2 && miLink2) {
      riLink2 = await prisma.riLink.create({
        data: {
          miLinkId: miLink2,
          riId1,
          riId2: ri.id,
        }
      })
    }
  }

  console.log({ ri, riVer, riLink1, riLink2 })

  return ri
}

async function main() {

  // 
  // DELETE
  // 

  // MI Attribute
  const riDeleted = await prisma.repoItem.deleteMany()
  console.log({ riDeleted })

  // MI Attribute
  const miAttrDeleted = await prisma.miAttr.deleteMany()
  console.log({ miAttrDeleted })

  // MI Attribute Type
  const miAttrTypeDeleted = await prisma.miAttrType.deleteMany()
  console.log({ miAttrTypeDeleted })

  // MI Link
  const miLinkDeleted = await prisma.miLink.deleteMany()
  console.log({ miLinkDeleted })

  // MI Link Type
  const miLinkTypeDeleted = await prisma.miLinkType.deleteMany()
  console.log({ miLinkTypeDeleted })

  // Meta Item
  const metaItemDeleted = await prisma.metaItem.deleteMany()
  console.log({ metaItemDeleted })

  // MI Type
  const miTypeDeleted = await prisma.miType.deleteMany()
  console.log({ miTypeDeleted })

  // 
  // CREATE
  // 

  // MI Type
  const miTypeCreated = await prisma.miType.createMany({
    data: [
      { id: "-1", name: "Unknown" },
      { id: "00", name: "Core" },
      { id: "01", name: "Architecture Domain" },
      { id: "02", name: "Perspective" },
      { id: "03", name: "Repo Item Type" },
    ],
    skipDuplicates: true,
  })
  console.log({ miTypeCreated })

  // Meta Item
  const metaItemCreated = await prisma.metaItem.createMany({
    data: [
      { id: "-1.00", miTypeId: "-1", name: "Unknown" },

      { id: "00.00", miTypeId: "00", name: "Core Attrs" },

      { id: "01.01", miTypeId: "01", name: "Business" },
      { id: "01.02", miTypeId: "01", name: "Application" },
      { id: "01.03", miTypeId: "01", name: "Data" },
      { id: "01.04", miTypeId: "01", name: "Technology" },

      { id: "02.01", miTypeId: "02", name: "Organization" },
      { id: "02.02", miTypeId: "02", name: "Application" },
      { id: "02.03", miTypeId: "02", name: "Integration" },

      { id: "03.01", miTypeId: "03", name: "Company" },
      { id: "03.02", miTypeId: "03", name: "Business Unit" },
      { id: "03.03", miTypeId: "03", name: "System" },
      { id: "03.04", miTypeId: "03", name: "Subsystem" },
      { id: "03.05", miTypeId: "03", name: "Info Flow" },
    ],
    skipDuplicates: true,
  })
  console.log({ metaItemCreated })

  // MI Link Type
  const miLinkTypeCreated = await prisma.miLinkType.createMany({
    data: [
      { id: "01", name: "Is Parent" },
      { id: "05", name: "Is Side A" },
      { id: "06", name: "Is Side B" },
      { id: "10", name: "Is Root" },
      { id: "30", name: "Reflects" },
    ],
    skipDuplicates: true,
  })
  console.log({ miLinkTypeCreated })

  // MI Link
  const miLinkCreated = await prisma.miLink.createMany({
    data: [
      { id: "03.01-03.02-01", miLinkTypeId: "01", miId1: "03.01", miId2: "03.02" },
      { id: "03.01-03.03-01", miLinkTypeId: "01", miId1: "03.01", miId2: "03.03" },
      { id: "03.02-03.03-01", miLinkTypeId: "01", miId1: "03.02", miId2: "03.03" },
      { id: "03.03-03.03-01", miLinkTypeId: "01", miId1: "03.03", miId2: "03.04" },

      { id: "03.03-03.05-05", miLinkTypeId: "05", miId1: "03.03", miId2: "03.05" },
      { id: "03.04-03.05-05", miLinkTypeId: "05", miId1: "03.04", miId2: "03.05" },
      { id: "03.03-03.05-06", miLinkTypeId: "06", miId1: "03.03", miId2: "03.05" },
      { id: "03.04-03.05-06", miLinkTypeId: "06", miId1: "03.04", miId2: "03.05" },

      { id: "01.02-03.01-10", miLinkTypeId: "10", miId1: "01.02", miId2: "03.01" },

      { id: "01.01-02.01-30", miLinkTypeId: "30", miId1: "01.01", miId2: "02.01" },
      { id: "01.02-02.01-30", miLinkTypeId: "30", miId1: "01.02", miId2: "02.01" },
      { id: "01.02-02.02-30", miLinkTypeId: "30", miId1: "01.02", miId2: "02.02" },
      { id: "01.02-02.03-30", miLinkTypeId: "30", miId1: "01.02", miId2: "02.03" },

      { id: "02.01-03.01-30", miLinkTypeId: "30", miId1: "02.01", miId2: "03.01" },
      { id: "02.01-03.02-30", miLinkTypeId: "30", miId1: "02.01", miId2: "03.02" },

      { id: "02.02-03.01-30", miLinkTypeId: "30", miId1: "02.02", miId2: "03.01" },
      { id: "02.02-03.02-30", miLinkTypeId: "30", miId1: "02.02", miId2: "03.02" },
      { id: "02.02-03.03-30", miLinkTypeId: "30", miId1: "02.02", miId2: "03.03" },
      { id: "02.02-03.04-30", miLinkTypeId: "30", miId1: "02.02", miId2: "03.04" },

      { id: "02.03-03.03-30", miLinkTypeId: "30", miId1: "02.03", miId2: "03.03" },
      { id: "02.03-03.04-30", miLinkTypeId: "30", miId1: "02.03", miId2: "03.04" },
      { id: "02.03-03.05-30", miLinkTypeId: "30", miId1: "02.03", miId2: "03.05" },
    ],
    skipDuplicates: true,
  })
  console.log({ miLinkCreated })

  // RI Attribute Type
  const miAttrTypeCreated = await prisma.miAttrType.createMany({
    data: [
      { id: "01", name: "Text", description: "Text Field" },
      { id: "02", name: "TextArea", description: "Text Field Area" },
      { id: "03", name: "LoV", description: "List of Values" },
    ],
    skipDuplicates: true,
  })
  console.log({ miAttrTypeCreated })

  // RI Attributes
  const miAttrCreated = await prisma.miAttr.createMany({
    data: [
      // Core
      { miId: "-1.00", miAttrTypeId: "03", name: "company", isUK: true, isNotNull: true, isEditable: true, isProp: false, ord: "A.01" },
      { miId: "00.00", miAttrTypeId: "01", name: "name", isUK: true, isNotNull: true, isEditable: true, isProp: false, ord: "A.02" },
      { miId: "00.00", miAttrTypeId: "02", name: "description", isUK: false, isNotNull: false, isEditable: true, isProp: false, ord: "A.03" },
      { miId: "00.00", miAttrTypeId: "01", name: "typeId", isUK: false, isNotNull: true, isEditable: false, isProp: true, ord: "Z.50" },
      { miId: "00.00", miAttrTypeId: "01", name: "id", isUK: false, isNotNull: true, isEditable: false, isProp: true, ord: "Z.60" },
      { miId: "00.00", miAttrTypeId: "01", name: "verId", isUK: false, isNotNull: true, isEditable: false, isProp: true, ord: "Z.70" },
      { miId: "00.00", miAttrTypeId: "01", name: "fd", isUK: false, isNotNull: false, isEditable: false, isProp: true, ord: "Z.80" },
      { miId: "00.00", miAttrTypeId: "01", name: "td", isUK: false, isNotNull: false, isEditable: false, isProp: true, ord: "Z.90" },
    ],
    skipDuplicates: true,
  })
  console.log({ miAttrCreated })

  // Company 1
  const company1 = await createRepoItem("03.01", "Comp_1")
  const app1_1 = await createRepoItem("03.03", "App_1_1", company1.id, "03.01-03.03-01")
  const app1_2 = await createRepoItem("03.03", "App_1_2", company1.id, "03.01-03.03-01")
  const app1_3 = await createRepoItem("03.03", "App_1_3", company1.id, "03.01-03.03-01")

  const link1_1_1_2 = await createRepoItem("03.05", "1-2: >Link", app1_1.id, "03.03-03.05-05", app1_2.id, "03.03-03.05-06")
  const link1_1_1_3 = await createRepoItem("03.05", "1-3: >Link", app1_1.id, "03.03-03.05-05", app1_3.id, "03.03-03.05-06")
  const link1_2_1_3 = await createRepoItem("03.05", "2-3: <Link", app1_2.id, "03.03-03.05-05", app1_3.id, "03.03-03.05-06")

  const company2 = await createRepoItem("03.01", "Comp_2")
  const app2_1 = await createRepoItem("03.03", "App_2_1", company2.id, "03.01-03.03-01")
  const app2_2 = await createRepoItem("03.03", "App_2_2", company2.id, "03.01-03.03-01")
  const app2_3 = await createRepoItem("03.03", "App_2_3", company2.id, "03.01-03.03-01")

  const company3 = await createRepoItem("03.01", "Comp_3")
  const app3_1 = await createRepoItem("03.03", "App_3_1", company3.id, "03.01-03.03-01")
  const app3_2 = await createRepoItem("03.03", "App_3_2", company3.id, "03.01-03.03-01")
  const app3_3 = await createRepoItem("03.03", "App_3_3", company3.id, "03.01-03.03-01")
}

main().then(async () => {
  await prisma.$disconnect()

}).catch(async (e) => {
  console.error(e)
  await prisma.$disconnect()
  process.exit(1)
})
