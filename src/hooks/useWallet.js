// ---------------------------------------------------------------------------
// useWallet — EIP-1193 (window.ethereum) wallet hook for the mint + hire flow.
//   connect()            → request accounts, ensure Base Sepolia (chain 84532)
//   mintAgent()          → sign AgentFactory.mintAgent tx (0.001 ETH), return txHash
//   createEscrowTask()   → sign TaskEscrow.createTask(agentOwner, amount), return txHash
//   completeEscrowTask() → sign TaskEscrow.completeTask(taskId), return txHash
// Uses viem's wallet client; no wagmi/RainbowKit dependency (lighter, fewer
// moving parts for the demo — PRD §4.3/§4.6 flows are fully covered).
// ---------------------------------------------------------------------------
import { useState, useCallback } from 'react'
import { createWalletClient, custom, keccak256, toBytes, parseEther, getAddress } from 'viem'
import { baseSepolia } from 'viem/chains'

const MINT_FEE = parseEther('0.001')

const FACTORY_ABI = [
  {
    type: 'function',
    name: 'mintAgent',
    stateMutability: 'payable',
    inputs: [{ type: 'bytes32', name: 'metadataHash' }],
    outputs: [{ type: 'uint256', name: 'tokenId' }],
  },
]

const ESCROW_ABI = [
  {
    type: 'function',
    name: 'createTask',
    stateMutability: 'payable',
    inputs: [
      { type: 'address', name: 'agentOwner' },
      { type: 'uint256', name: 'amount' },
    ],
    outputs: [{ type: 'uint256', name: 'taskId' }],
  },
  {
    type: 'function',
    name: 'completeTask',
    stateMutability: 'nonpayable',
    inputs: [{ type: 'uint256', name: 'taskId' }],
    outputs: [],
  },
]

function getProvider() {
  if (typeof window !== 'undefined' && window.ethereum) return window.ethereum
  return null
}

export function useWallet() {
  const [address, setAddress] = useState(null)
  const [chainId, setChainId] = useState(null)
  const [connecting, setConnecting] = useState(false)
  const [error, setError] = useState(null)

  const ensureChain = useCallback(async (provider) => {
    const id = await provider.request({ method: 'eth_chainId' })
    const target = `0x${baseSepolia.id.toString(16)}`
    if (id.toLowerCase() === target) {
      setChainId(baseSepolia.id)
      return
    }
    try {
      await provider.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: target }],
      })
    } catch (e) {
      // 4902 = chain not added yet → add it
      if (e.code === 4902) {
        await provider.request({
          method: 'wallet_addEthereumChain',
          params: [
            {
              chainId: target,
              chainName: 'Base Sepolia',
              nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
              rpcUrls: ['https://sepolia.base.org'],
              blockExplorerUrls: ['https://sepolia.basescan.org'],
            },
          ],
        })
      } else {
        throw e
      }
    }
    setChainId(baseSepolia.id)
  }, [])

  const connect = useCallback(async () => {
    const provider = getProvider()
    if (!provider) {
      setError('No wallet found — install MetaMask, Rainbow or Coinbase Wallet to mint an agent.')
      return null
    }
    setConnecting(true)
    setError(null)
    try {
      const accounts = await provider.request({ method: 'eth_requestAccounts' })
      await ensureChain(provider)
      setAddress(getAddress(accounts[0]))
      return getAddress(accounts[0])
    } catch (e) {
      setError(e?.message || 'Wallet connection failed')
      return null
    } finally {
      setConnecting(false)
    }
  }, [ensureChain])

  const mintAgent = useCallback(
    async ({ factoryAddress, name, personaPrompt, specialty }) => {
      const provider = getProvider()
      if (!provider || !address) {
        setError('Connect your wallet first')
        return null
      }
      setError(null)
      try {
        await ensureChain(provider)
        const walletClient = createWalletClient({ chain: baseSepolia, transport: custom(provider) })
        const metadataHash = keccak256(toBytes(`${name}|${personaPrompt}|${specialty}`))
        const txHash = await walletClient.writeContract({
          address: factoryAddress,
          abi: FACTORY_ABI,
          functionName: 'mintAgent',
          args: [metadataHash],
          value: MINT_FEE,
          account: address,
        })
        return txHash
      } catch (e) {
        setError(e?.shortMessage || e?.message || 'Mint transaction failed')
        return null
      }
    },
    [address, ensureChain]
  )

  // Lock payment in TaskEscrow when hiring an agent (PRD §4.6)
  const createEscrowTask = useCallback(
    async ({ escrowAddress, agentOwner, amountEth }) => {
      const provider = getProvider()
      if (!provider || !address) {
        setError('Connect your wallet first')
        return null
      }
      setError(null)
      try {
        await ensureChain(provider)
        const walletClient = createWalletClient({ chain: baseSepolia, transport: custom(provider) })
        const txHash = await walletClient.writeContract({
          address: escrowAddress,
          abi: ESCROW_ABI,
          functionName: 'createTask',
          args: [agentOwner, parseEther(String(amountEth))],
          value: parseEther(String(amountEth)),
          account: address,
        })
        return txHash
      } catch (e) {
        setError(e?.shortMessage || e?.message || 'Escrow transaction failed')
        return null
      }
    },
    [address, ensureChain]
  )

  // Consumer confirms completion → releases payout to the agent owner
  const completeEscrowTask = useCallback(
    async ({ escrowAddress, taskId }) => {
      const provider = getProvider()
      if (!provider || !address) {
        setError('Connect your wallet first')
        return null
      }
      setError(null)
      try {
        await ensureChain(provider)
        const walletClient = createWalletClient({ chain: baseSepolia, transport: custom(provider) })
        const txHash = await walletClient.writeContract({
          address: escrowAddress,
          abi: ESCROW_ABI,
          functionName: 'completeTask',
          args: [BigInt(taskId)],
          account: address,
        })
        return txHash
      } catch (e) {
        setError(e?.shortMessage || e?.message || 'Confirmation transaction failed')
        return null
      }
    },
    [address, ensureChain]
  )

  return { address, chainId, connecting, error, connect, mintAgent, createEscrowTask, completeEscrowTask, setError }
}