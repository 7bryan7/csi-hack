// ---------------------------------------------------------------------------
// Deploy AgentFactory + TaskEscrow to Base Sepolia.
//   npx hardhat run scripts/deploy.js --network baseSepolia
// Prints addresses + verification commands. Treasury defaults to the deployer
// (or TREASURY env var if set).
// ---------------------------------------------------------------------------
const hre = require('hardhat')

async function main() {
  const [deployer] = await hre.ethers.getSigners()
  const treasury = process.env.TREASURY || deployer.address
  console.log('Deployer:', deployer.address)
  console.log('Treasury:', treasury)

  const AgentFactory = await hre.ethers.getContractFactory('AgentFactory')
  const factory = await AgentFactory.deploy(treasury)
  await factory.waitForDeployment()
  const factoryAddr = await factory.getAddress()
  console.log('AgentFactory deployed:', factoryAddr)

  const TaskEscrow = await hre.ethers.getContractFactory('TaskEscrow')
  const escrow = await TaskEscrow.deploy(treasury, 24 * 60 * 60) // 24h auto-release
  await escrow.waitForDeployment()
  const escrowAddr = await escrow.getAddress()
  console.log('TaskEscrow deployed:', escrowAddr)

  console.log('\nVerify (Basescan Sepolia):')
  console.log(`npx hardhat verify --network baseSepolia ${factoryAddr} ${treasury}`)
  console.log(`npx hardhat verify --network baseSepolia ${escrowAddr} ${treasury} 86400`)

  // Write addresses for the backend to read (server/chain.js in Phase 2/3).
  const fs = require('fs')
  const path = require('path')
  const out = path.join(__dirname, '..', 'deployed.json')
  fs.writeFileSync(
    out,
    JSON.stringify(
      {
        network: 'baseSepolia',
        chainId: 84532,
        treasury,
        agentFactory: factoryAddr,
        taskEscrow: escrowAddr,
        deployedAt: new Date().toISOString(),
      },
      null,
      2
    )
  )
  console.log('\nAddresses written to deployed.json')
}

main().catch((e) => {
  console.error(e)
  process.exitCode = 1
})