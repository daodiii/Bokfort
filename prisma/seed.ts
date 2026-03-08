import { PrismaClient, CategoryType } from "../src/generated/prisma"

const prisma = new PrismaClient()

const defaultCategories = [
  { name: "Kontorutstyr", type: CategoryType.EXPENSE },
  { name: "Programvare", type: CategoryType.EXPENSE },
  { name: "Reise", type: CategoryType.EXPENSE },
  { name: "Transport", type: CategoryType.EXPENSE },
  { name: "Telefon og internett", type: CategoryType.EXPENSE },
  { name: "Forsikring", type: CategoryType.EXPENSE },
  { name: "Husleie", type: CategoryType.EXPENSE },
  { name: "Regnskap og revisjon", type: CategoryType.EXPENSE },
  { name: "Markedsføring", type: CategoryType.EXPENSE },
  { name: "Kurs og opplæring", type: CategoryType.EXPENSE },
  { name: "Kontorrekvisita", type: CategoryType.EXPENSE },
  { name: "Representasjon", type: CategoryType.EXPENSE },
  { name: "Vedlikehold", type: CategoryType.EXPENSE },
  { name: "Annet", type: CategoryType.EXPENSE },
  { name: "Salg av varer", type: CategoryType.INCOME },
  { name: "Salg av tjenester", type: CategoryType.INCOME },
  { name: "Konsulenthonorar", type: CategoryType.INCOME },
  { name: "Renteinntekter", type: CategoryType.INCOME },
  { name: "Annen inntekt", type: CategoryType.INCOME },
]

async function main() {
  console.log("Seeding default categories...")

  for (const cat of defaultCategories) {
    await prisma.category.upsert({
      where: { id: `default-${cat.name.toLowerCase().replace(/\s+/g, "-")}` },
      update: {},
      create: {
        id: `default-${cat.name.toLowerCase().replace(/\s+/g, "-")}`,
        name: cat.name,
        type: cat.type,
        isDefault: true,
        teamId: null,
      },
    })
  }

  console.log("Seeding complete.")
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
