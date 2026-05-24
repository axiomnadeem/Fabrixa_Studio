// =============================================================
// Cloud persistence — STRICT 3-collection flat schema.
//
//   users/{uid}              → subscription/coin state (mirrored from Zustand)
//   projects/{projectId}     → saved designs, owned by userId
//   showroomDesigns/{id}     → catalog of unlockable showroom designs
//
// No subcollections, no exports/aiDesigns/renders3d/credits collections.
// Any historical record-* helpers are intentionally retained as no-ops so
// existing UI call-sites compile without writing to non-existent tables.
// =============================================================
import {
  doc, getDoc, setDoc, collection, serverTimestamp, getDocs, query,
  where, orderBy, deleteDoc,
} from "firebase/firestore";
import { getDb } from "@/lib/firebase";
import type { PartState } from "@/lib/fabrixa/garments";
import { APP_DATA_0, type SubscriptionTierId } from "@/lib/fabrixa/APP_DATA_0";

const COL = APP_DATA_0.db.collections;

// ---------- users/{uid} ----------
export interface UserDoc {
  id: string;
  subscriptionTier: SubscriptionTierId | null;
  basePlanExpiry: number | null;
  coinBalance: number;
  dailyAllowance: number;
  lastDailyResetAt: number;
  hasAiPack: boolean;
  aiPackExpiry: number | null;
  dailyAiRequestsRemaining: number;
  dailyShowroomDownloadsCount: number;
  unlockedShowroomDesigns: string[];
}

export async function loadUserDoc(uid: string): Promise<UserDoc | null> {
  const ref = doc(getDb(), COL.users, uid);
  const snap = await getDoc(ref);
  if (!snap.exists()) return null;
  return snap.data() as UserDoc;
}

export async function saveUserDoc(uid: string, data: Partial<UserDoc>): Promise<void> {
  const ref = doc(getDb(), COL.users, uid);
  await setDoc(ref, { id: uid, ...data }, { merge: true });
}

// ---------- projects/{id} ----------
export interface ProjectDoc {
  id: string;
  userId: string;
  name: string;
  canvasState: { partStates: Record<string, PartState>; typeId: string };
  thumbnail: string;
  updatedAt: unknown;
}

export type SavedProject = Pick<ProjectDoc, "canvasState"> & { name?: string; thumbnail?: string };

/** Save a project document. If projectId omitted, uses a stable "default" id per user. */
export async function saveProject(
  uid: string,
  data: SavedProject,
  projectId?: string,
): Promise<string> {
  const id = projectId ?? `${uid}_default`;
  const ref = doc(getDb(), COL.projects, id);
  await setDoc(
    ref,
    {
      id,
      userId: uid,
      name: data.name ?? "Untitled",
      canvasState: data.canvasState,
      thumbnail: data.thumbnail ?? "",
      updatedAt: serverTimestamp(),
    },
    { merge: true },
  );
  return id;
}

export async function loadProject(uid: string, projectId?: string): Promise<ProjectDoc | null> {
  const id = projectId ?? `${uid}_default`;
  const ref = doc(getDb(), COL.projects, id);
  const snap = await getDoc(ref);
  if (!snap.exists()) return null;
  return snap.data() as ProjectDoc;
}

export async function listUserProjects(uid: string): Promise<ProjectDoc[]> {
  const q = query(
    collection(getDb(), COL.projects),
    where("userId", "==", uid),
    orderBy("updatedAt", "desc"),
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => d.data() as ProjectDoc);
}

export async function deleteProject(projectId: string): Promise<void> {
  await deleteDoc(doc(getDb(), COL.projects, projectId));
}

/**
 * Save a named design snapshot.
 * Stored as its own document in the flat `projects` collection.
 */
export async function saveNamedDesign(
  uid: string,
  name: string,
  data: { partStates: Record<string, PartState>; typeId: string; thumbnail?: string },
): Promise<string> {
  const id = `${uid}_${Date.now()}`;
  await saveProject(
    uid,
    {
      name,
      thumbnail: data.thumbnail,
      canvasState: { partStates: data.partStates, typeId: data.typeId },
    },
    id,
  );
  return id;
}

// ---------- showroomDesigns/{id} ----------
export interface ShowroomDesign {
  id: string;
  name: string;
  imageUrl: string;
}

export async function listShowroomDesigns(): Promise<ShowroomDesign[]> {
  const snap = await getDocs(collection(getDb(), COL.showroomDesigns));
  return snap.docs.map((d) => d.data() as ShowroomDesign);
}

// ---------- legacy record-* helpers ----------
// Schema explicitly forbids exports / aiDesigns / renders3d collections.
// These are no-ops so existing call-sites compile cleanly.
export async function recordExport(_uid: string, _info: { format: string; quality: string; bytes?: number }) { /* no-op */ }
export async function recordAiDesign(_uid: string, _info: { task: string; prompt: string; model: string }) { /* no-op */ }
export async function recordRender3d(_uid: string, _info: { typeId: string; scene: string }) { /* no-op */ }
export async function listRecentExports(_uid: string, _n = 20): Promise<unknown[]> { return []; }
