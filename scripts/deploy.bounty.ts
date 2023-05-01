import { main } from "./deploy.bounty.setup";

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

// npx hardhat run ./scripts/deploy.bounty.ts --network mumbai
