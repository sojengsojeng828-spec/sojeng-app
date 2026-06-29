import { useEffect, useRef, useState, useCallback } from 'react'
import { supabase, isSupabaseReady } from './supabase'

// ============================================================
// ชื่อตาราง Supabase ที่ใช้เก็บข้อมูลแต่ละ key ของแอป
// (ทุก key เก็บเป็น JSON ใน column "data" ของตาราง "app_data")
// โครงสร้างตาราง:
//   CREATE TABLE app_data (
//     key   TEXT PRIMARY KEY,
//     data  JSONB NOT NULL DEFAULT '[]',
//     updated_at TIMESTAMPTZ DEFAULT now()
//   );
// ============================================================

const TABLE = 'app_data'

// ---------- สถานะ sync แบบ global (ใช้ร่วมกันทุก hook) ----------
let __syncStatus = 'saved'               // 'saving' | 'saved' | 'error'
const __statusListeners = new Set()

function setGlobalStatus(status) {
  __syncStatus = status
  __statusListeners.forEach((fn) => fn(status))
}

// ---------- useSyncStatus ----------
// Hook คืนค่าสถานะการ sync ปัจจุบัน ('saving' | 'saved' | 'error')
export function useSyncStatus() {
  const [status, setStatus] = useState(__syncStatus)

  useEffect(() => {
    __statusListeners.add(setStatus)
    return () => __statusListeners.delete(setStatus)
  }, [])

  return status
}

// ---------- loadAllFromSupabase ----------
// โหลดข้อมูลทุก key จากตาราง app_data ครั้งเดียวตอนเปิดแอป
// คืนค่าเป็น object { key: value[] }
export async function loadAllFromSupabase() {
  if (!isSupabaseReady) return {}

  const { data, error } = await supabase.from(TABLE).select('key, data')
  if (error || !data) return {}

  const result = {}
  for (const row of data) {
    try {
      result[row.key] = row.data ?? []
    } catch {
      result[row.key] = []
    }
  }
  return result
}

// ---------- saveToSupabase ----------
// บันทึกข้อมูลของ key ที่กำหนดลง Supabase ทันที
// records คือ array หรือ object ที่ต้องการบันทึก
export async function saveToSupabase(key, records) {
  if (!isSupabaseReady) return false

  setGlobalStatus('saving')
  const { error } = await supabase
    .from(TABLE)
    .upsert(
      { key, data: records, updated_at: new Date().toISOString() },
      { onConflict: 'key' }
    )

  if (error) {
    console.error(`saveToSupabase error [${key}]:`, error)
    setGlobalStatus('error')
    return false
  }

  setGlobalStatus('saved')
  return true
}

// ---------- useSupabaseSync ----------
// Hook: sync state → Supabase อัตโนมัติเมื่อ state เปลี่ยนหลังจาก loaded = true
// มี debounce 1.2 วินาทีเพื่อลดจำนวน request
export function useSupabaseSync(key, state, setState, loaded) {
  const isFirstRun = useRef(true)
  const debounceRef = useRef(null)
  const stateRef = useRef(state)

  // เก็บ state ล่าสุดใน ref เสมอ (ป้องกัน stale closure)
  useEffect(() => {
    stateRef.current = state
  }, [state])

  useEffect(() => {
    if (!loaded) return
    if (!isSupabaseReady) return

    // ครั้งแรกหลัง loaded — ข้ามการ save (ข้อมูลเพิ่งโหลดมาจาก Supabase)
    if (isFirstRun.current) {
      isFirstRun.current = false
      return
    }

    // debounce: รอ 1.2 วิหลังจาก state หยุดเปลี่ยนแล้วค่อย save
    clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      saveToSupabase(key, stateRef.current)
    }, 1200)

    return () => clearTimeout(debounceRef.current)
  }, [key, loaded, state])
}
