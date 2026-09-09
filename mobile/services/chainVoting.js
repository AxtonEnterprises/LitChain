import { doc, runTransaction, serverTimestamp } from "firebase/firestore";
import { auth, db } from "../lib/firebase";
import { createChainVotingService } from "../../shared/chainVoting";

const service = createChainVotingService({ db, auth, doc, runTransaction, serverTimestamp });
export const voteOnChainEntry = service.voteOnEntry;
