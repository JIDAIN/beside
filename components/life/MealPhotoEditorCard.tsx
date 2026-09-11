"use client";

import { useState, type ChangeEvent } from "react";
import { MealPhotoFrame } from "@/components/life/MealPhotoFrame";
import { AppButton } from "@/components/ui/AppButton";
import type { MealPhotoRotation } from "@/lib/nutrition/meal-service";

type MealPhotoEditorCardProps = {
  visible: boolean;
  src: string;
  rotationDegrees: MealPhotoRotation;
  scale: number;
  disabled?: boolean;
  onChoosePhoto: (file: File | null) => void;
  onClearPhoto: () => void;
  onRotatePhoto: (delta: -90 | 90) => void;
  onResizePhoto: (percent: number) => void;
};

export function MealPhotoEditorCard({
  visible,
  src,
  rotationDegrees,
  scale,
  disabled = false,
  onChoosePhoto,
  onClearPhoto,
  onRotatePhoto,
  onResizePhoto,
}: MealPhotoEditorCardProps) {
  const [adjustOpen, setAdjustOpen] = useState(false);

  function choosePhoto(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0] ?? null;
    onChoosePhoto(file);
    event.target.value = "";
  }

  function removePhoto() {
    setAdjustOpen(false);
    onClearPhoto();
  }

  return <>
    <section className="life-surface life-section-card life-meal-photo-card">
      <div className="life-meal-photo-card-title"><p className="text-sm font-extrabold text-[var(--life-text)]">餐食照片</p></div>
      <div className="life-meal-photo-row">
        {visible ? (
          <button type="button" className="life-meal-photo-preview" onClick={() => setAdjustOpen(true)} aria-label="查看或调整餐食照片">
            <MealPhotoFrame src={src} alt="当前餐食照片" rotationDegrees={rotationDegrees} scale={scale} className="life-meal-photo-thumb" />
          </button>
        ) : (
          <div className="life-meal-photo-empty" aria-label="暂无餐食照片"><span>暂无照片</span></div>
        )}

        <div className="life-meal-photo-controls">
          <label className="life-meal-photo-secondary">
            {visible ? "更换照片" : "上传照片"}
            <input type="file" accept="image/jpeg,image/png,image/webp,image/heic,image/heif" className="sr-only" disabled={disabled} onChange={choosePhoto} />
          </label>
          {visible ? <button type="button" disabled={disabled} onClick={() => setAdjustOpen(true)} className="life-meal-photo-secondary">调整照片</button> : null}
          {visible ? <button type="button" disabled={disabled} onClick={removePhoto} className="life-meal-photo-danger">删除照片</button> : null}
        </div>
      </div>
    </section>

    {adjustOpen && visible ? (
      <div className="life-sheet-backdrop" role="presentation" onMouseDown={() => setAdjustOpen(false)}>
        <section className="life-mood-sheet life-photo-adjust-sheet" role="dialog" aria-modal="true" aria-labelledby="photo-adjust-title" onMouseDown={(event) => event.stopPropagation()}>
          <div className="mx-auto mb-3 h-1.5 w-10 rounded-full bg-[var(--life-border)]" />
          <h2 id="photo-adjust-title" className="text-center text-lg font-black text-[var(--life-text)]">调整照片</h2>
          <MealPhotoFrame src={src} alt="餐食照片调整预览" rotationDegrees={rotationDegrees} scale={scale} className="life-photo-adjust-preview" />
          <div className="life-photo-adjust-turns">
            <button type="button" onClick={() => onRotatePhoto(-90)} className="life-meal-photo-secondary">↶ 左转 90°</button>
            <button type="button" onClick={() => onRotatePhoto(90)} className="life-meal-photo-secondary">右转 90° ↷</button>
          </div>
          <label className="life-photo-adjust-range">
            <span><span>照片大小</span><strong>{Math.round(scale * 100)}%</strong></span>
            <input type="range" min="60" max="100" step="5" value={Math.round(scale * 100)} onChange={(event) => onResizePhoto(Number(event.target.value))} />
          </label>
          <AppButton variant="primary" className="mt-4 w-full" onClick={() => setAdjustOpen(false)}>完成</AppButton>
        </section>
      </div>
    ) : null}
  </>;
}