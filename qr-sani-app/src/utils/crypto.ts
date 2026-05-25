import nacl from 'tweetnacl';
import naclUtil from 'tweetnacl-util';
import AsyncStorage from '@react-native-async-storage/async-storage';

const KEYPAIR_STORAGE_KEY = '@app_chat_keypair';

export interface KeyPair {
  publicKey: string;
  secretKey: string;
}

// Get or generate keypair for the current user
export const getOrCreateKeyPair = async (): Promise<KeyPair> => {
  try {
    const stored = await AsyncStorage.getItem(KEYPAIR_STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored) as KeyPair;
    }
    
    // Generate new Box keypair for asymmetric encryption
    const keyPair = nacl.box.keyPair();
    const newKeys: KeyPair = {
      publicKey: naclUtil.encodeBase64(keyPair.publicKey),
      secretKey: naclUtil.encodeBase64(keyPair.secretKey)
    };
    
    await AsyncStorage.setItem(KEYPAIR_STORAGE_KEY, JSON.stringify(newKeys));
    return newKeys;
  } catch (error) {
    console.error("Error managing keypair", error);
    throw error;
  }
};

// Encrypt a message to send to a receiver
export const encryptMessage = (
  messageText: string, 
  receiverPublicKeyBase64: string, 
  senderSecretKeyBase64: string
): { nonce: string, encrypted: string } => {
  
  const receiverPublicKey = naclUtil.decodeBase64(receiverPublicKeyBase64);
  const senderSecretKey = naclUtil.decodeBase64(senderSecretKeyBase64);
  
  // Generate random nonce (must be unique per message)
  const nonce = nacl.randomBytes(nacl.box.nonceLength);
  
  // Encode message
  const messageUint8 = naclUtil.decodeUTF8(messageText);
  
  // Encrypt
  const encrypted = nacl.box(messageUint8, nonce, receiverPublicKey, senderSecretKey);
  
  return {
    nonce: naclUtil.encodeBase64(nonce),
    encrypted: naclUtil.encodeBase64(encrypted)
  };
};

// Decrypt an incoming message
export const decryptMessage = (
  encryptedBase64: string,
  nonceBase64: string,
  senderPublicKeyBase64: string,
  receiverSecretKeyBase64: string
): string | null => {
  try {
    const encrypted = naclUtil.decodeBase64(encryptedBase64);
    const nonce = naclUtil.decodeBase64(nonceBase64);
    const senderPublicKey = naclUtil.decodeBase64(senderPublicKeyBase64);
    const receiverSecretKey = naclUtil.decodeBase64(receiverSecretKeyBase64);

    const decrypted = nacl.box.open(encrypted, nonce, senderPublicKey, receiverSecretKey);
    
    if (!decrypted) return null; // Decryption failed (wrong keys or tampered)
    
    return naclUtil.encodeUTF8(decrypted);
  } catch (err) {
    console.error("Decryption error", err);
    return null;
  }
};
