        import React, { useState, useRef, useEffect } from "react";
        import { useAudio } from "../AudioContext";

        interface LyricsModalProps {
            songId: number;
            onClose: () => void;
        }

        const LyricsModal: React.FC<LyricsModalProps> = ({ songId, onClose }) => {
            const { currentSong, isPlaying, togglePlayPause, seek, currentTime, duration } = useAudio();
            const [isFullScreen, setIsFullScreen] = useState(false);
            const [songData, setSongData] = useState<any>(null);
            const [error, setError] = useState<string | null>(null);
            const modalRef = useRef<HTMLDivElement>(null);
            const videoRef = useRef<HTMLVideoElement>(null);
            const baseUrl = "http://localhost:8000"; // URL gốc cho file media

            useEffect(() => {
                const fetchSongData = async () => {
                    try {
                        const response = await fetch(`${baseUrl}/api/songs/${songId}/`, {
                            headers: {
                                "Accept": "application/json",
                                "Content-Type": "application/json",
                            },
                        });

                        if (!response.ok) {
                            const errorText = await response.text();
                            throw new Error(`Yêu cầu API thất bại với mã trạng thái ${response.status}: ${errorText}`);
                        }

                        const data = await response.json();
                        console.log("Dữ liệu API:", data); // Ghi log dữ liệu API
                        console.log("URL video/âm thanh:", `${baseUrl}/audio/${data.song_url}`); // Ghi log URL

                        const lyricsArray = data.lyrics
                            ? data.lyrics.split(".").filter((line: string) => line.trim() !== "")
                            : [];
                        const processedLyrics = lyricsArray.map((line: string, index: number) => ({
                            text: line.trim(),
                            time: 0,
                        }));

                        setSongData({
                            title: data.name,
                            artists: data.artist_name,
                            audioUrl: data.song_url, 
                            duration: data.duration,
                            album_img: data.album_img,
                            album_name: data.album_name,
                            lyrics: processedLyrics,
                        });
                    } catch (err: any) {
                        console.error("Lỗi API:", err.message);
                        setError(err.message);
                    }
                };

                fetchSongData();
            }, [songId]);

            //cap nhap dong bo giua v
            useEffect(() => {
                if (videoRef.current && songData?.audioUrl?.toLowerCase().endsWith('.mp4')) {
                    if (isPlaying) {
                        videoRef.current.play().catch((err) => console.error("Lỗi phát video:", err));
                    } else {
                        videoRef.current.pause();
                    }
                    videoRef.current.currentTime = currentTime;
                }
            }, [isPlaying, currentTime, songData]);

            const forward = () => {
                const newTime = Math.min(duration, currentTime + 10);
                seek(newTime);
                if (videoRef.current) {
                    videoRef.current.currentTime = newTime;
                }
            };

            const rewind = () => {
                const newTime = Math.max(0, currentTime - 10);
                seek(newTime);
                if (videoRef.current) {
                    videoRef.current.currentTime = newTime;
                }
            };

            const toggleFullScreen = () => {
                if (!modalRef.current) return;
                if (!isFullScreen) {
                    modalRef.current.requestFullscreen();
                    setIsFullScreen(true);
                } else {
                    document.exitFullscreen();
                    setIsFullScreen(false);
                }
            };

            useEffect(() => {
                const handleFullScreenChange = () => {
                    setIsFullScreen(!!document.fullscreenElement);
                };

                document.addEventListener("fullscreenchange", handleFullScreenChange);
                return () => {
                    document.removeEventListener("fullscreenchange", handleFullScreenChange);
                };
            }, []);

            if (!songData) {
                return (
                    <div className="fixed inset-0 bg-black bg-opacity-70 flex justify-center items-center z-50 p-4 font-sans">
                        <div className="bg-[#121212] bg-opacity-90 backdrop-blur-lg rounded-2xl shadow-xl p-8 text-white">
                            <p className="text-[#B3B3B3] text-center">Đang tải...</p>
                        </div>
                    </div>
                );
            }

            return (
                <div className="fixed inset-0 bg-black bg-opacity-70 flex justify-center items-center z-50 p-4 font-sans">
                    <div
                        ref={modalRef}
                        className="bg-[#121212] bg-opacity-90 backdrop-blur-lg rounded-2xl shadow-xl w-full max-w-5xl overflow-hidden flex transition-all duration-300"
                    >
                        <div className="w-1/2 p-6 flex flex-col">
                            {/* Thêm phát video nếu file là mp4 */}
                            <div className="relative group flex-1">
                                {songData && songData.audioUrl && songData.audioUrl.toLowerCase().endsWith('.mp4') ? (
                                    <video
                                        ref={videoRef}
                                        src={`${baseUrl}/audio/${songData.audioUrl}`} 
                                        loop
                                        muted
                                        playsInline
                                        className="h-full w-full object-cover rounded-xl transition-transform duration-500 group-hover:scale-105 border border-[#2A2A2A] shadow-lg"
                                        onError={(e) => console.error('Không tải được video:', `${baseUrl}/audio/${songData.audioUrl}`, e)}
                                        onLoadedData={() => console.log('Video tải thành công:', `${baseUrl}/audio/${songData.audioUrl}`)}
                                    />
                                ) : songData && (songData.audioUrl?.toLowerCase().endsWith('.mp3') || !songData.audioUrl) ? (
                                    <img
                                        src={songData.album_img ? `/uploads/albums/${songData.album_img}` : '/path/to/fallback-image.jpg'}
                                        alt="Ảnh Album"
                                        className="h-full w-full object-cover rounded-xl transition-transform duration-500 group-hover:scale-105 border border-[#2A2A2A] shadow-lg"
                                        onError={() => console.error('Không tải được ảnh:', songData.album_img)}
                                    />
                                ) : (
                                    <div className="h-full w-full flex items-center justify-center bg-gray-800 rounded-xl border border-[#2A2A2A] shadow-lg">
                                        <p className="text-[#B3B3B3] text-center">Không có media</p>
                                    </div>
                                )}
                            </div>

                            <div className="mt-4">
                                <h1 className="text-[#1DB954] text-2xl font-extrabold tracking-tight">{songData.title}</h1>
                                <h2 className="text-[#B3B3B3] text-lg font-semibold tracking-wide">{songData.artists}</h2>
                                <p className="text-[#B3B3B3] text-sm italic">{songData.album_name || "Album không xác định"}</p>
                            </div>
                        </div>

                        <div className="w-1/2 p-8 flex flex-col justify-between text-white">
                            <div className="flex justify-end items-center border-b border-[#2A2A2A] pb-3">
                                <div className="flex space-x-4">
                                    <button
                                        onClick={toggleFullScreen}
                                        className="text-[#B3B3B3] hover:text-[#76a888] transition-transform duration-300 transform hover:scale-110"
                                    >
                                        {isFullScreen ? (
                                     <svg
                                     xmlns="http://www.w3.org/2000/svg"
                                     className="h-6 w-6"
                                     viewBox="0 0 24 24"
                                     fill="none"
                                     stroke="currentColor"
                                     strokeWidth={2}
                                     strokeLinecap="round"
                                     strokeLinejoin="round"
                                   >
                                     <path d="M4 12h6M6 10l-2 2 2 2" />
                                     <path d="M20 12h-6M18 10l2 2-2 2" />
                                     <path d="M12 4v6M10 6l2-2 2 2" />
                                     <path d="M12 20v-6M14 18l-2 2-2-2" />
                                   </svg>
                                   
                                        ) : (
                                            <svg
                                                xmlns="http://www.w3.org/2000/svg"
                                                className="h-6 w-6"
                                                fill="none"
                                                viewBox="0 0 24 24"
                                                stroke="currentColor"
                                            >
                                                <path
                                                    strokeLinecap="round"
                                                    strokeLinejoin="round"
                                                    strokeWidth={2}
                                                    d="M4 8V4h4M4 16v4h4M16 4h4v4M16 20h4v-4"
                                                />
                                            </svg>
                                            
                                        )}
                                    </button>
                                    <button
                                        onClick={onClose}
                                        className="text-[#B3B3B3] hover:text-[#1DB954] transition-transform duration-300 transform hover:scale-110"
                                    >
                                        <svg
                                            xmlns="http://www.w3.org/2000/svg"
                                            className="h-6 w-6"
                                            fill="none"
                                            viewBox="0 0 24 24"
                                            stroke="currentColor"
                                        >
                                            <path
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                                strokeWidth={2}
                                                d="M6 18L18 6M6 6l12 12"
                                            />
                                        </svg>
                                    </button>
                                </div>
                            </div>

                            <div className="flex-1 max-h-96 overflow-y-auto my-6 scrollbar-thin scrollbar-thumb-[#2A2A2A] scrollbar-track-transparent">
                                {songData.lyrics.length > 0 ? (
                                    songData.lyrics.map((line: any, index: number) => (
                                        <div
                                            key={index}
                                            className="text-center my-5 text-lg tracking-wide text-white"
                                        >
                                            {line.text}
                                        </div>
                                    ))
                                ) : (
                                    <div className="text-center my-5 text-lg tracking-wide text-[#B3B3B3]">
                                        Lời bài hát chưa được cập nhật
                                    </div>
                                )}
                            </div>

                            <div className="mt-6">
                                {error && (
                                    <p className="text-red-400 text-center text-sm mb-3">
                                        {error} (Sử dụng dữ liệu dự phòng)
                                    </p>
                                )}
                                <div className="flex items-center justify-between text-[#B3B3B3] text-sm mb-4">
                                    <span>
                                        {Math.floor(currentTime / 60)}:
                                        {Math.floor(currentTime % 60)
                                            .toString()
                                            .padStart(2, "0")}
                                    </span>
                                    <span>
                                        {Math.floor(duration / 60)}:
                                        {Math.floor(duration % 60)
                                            .toString()
                                            .padStart(2, "0")}
                                    </span>
                                </div>
                                <input
                                    type="range"
                                    min="0"
                                    max={duration}
                                    value={currentTime}
                                    onChange={(e) => {
                                        const newTime = Number(e.target.value);
                                        seek(newTime);
                                        if (videoRef.current) {
                                            videoRef.current.currentTime = newTime;
                                        }
                                    }}
                                    className="w-full h-1 bg-[#2A2A2A] rounded-full appearance-none cursor-pointer transition-all duration-300"
                                    style={{
                                        background: `linear-gradient(to right, #1DB954 ${(currentTime / duration) * 100}% , #4b5563 ${(currentTime / duration) * 100}%)`,
                                    }}
                                />
                                <div className="flex justify-center items-center space-x-8 mt-6">
                                    <button
                                        onClick={rewind}
                                        className="text-[#B3B3B3] hover:text-[#1DB954] transform hover:scale-110 transition-all duration-300"
                                    >
                                        <svg
                                            xmlns="http://www.w3.org/2000/svg"
                                            className="h-6 w-6"
                                            fill="none"
                                            viewBox="0 0 24 24"
                                            stroke="currentColor"
                                        >
                                            <path
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                                strokeWidth={2}
                                                d="M12.066 11.2a1 1 0 000 1.6l5.334 4A1 1 0 0019 16V8a1 1 0 00-1.6-.8l-5.333 4zM4.066 11.2a1 1 0 000 1.6l5.334 4A1 1 0 0011 16V8a1 1 0 00-1.6-.8l-5.334 4z"
                                            />
                                        </svg>
                                    </button>
                                    <button
                                        onClick={togglePlayPause}
                                        className="text-white bg-[#1DB954] p-3 rounded-full hover:bg-[#1ed760] transform hover:scale-110 transition-all duration-300"
                                    >
                                        {isPlaying ? (
                                            <svg
                                                xmlns="http://www.w3.org/2000/svg"
                                                className="h-6 w-6"
                                                fill="none"
                                                viewBox="0 0 24 24"
                                                stroke="currentColor"
                                            >
                                                <path
                                                    strokeLinecap="round"
                                                    strokeLinejoin="round"
                                                    strokeWidth={2}
                                                    d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z"
                                                />
                                            </svg>
                                        ) : (
                                            <svg
                                                xmlns="http://www.w3.org/2000/svg"
                                                className="h-6 w-6"
                                                fill="none"
                                                viewBox="0 0 24 24"
                                                stroke="currentColor"
                                            >
                                                <path
                                                    strokeLinecap="round"
                                                    strokeLinejoin="round"
                                                    strokeWidth={2}
                                                    d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"
                                                />
                                                <path
                                                    strokeLinecap="round"
                                                    strokeLinejoin="round"
                                                    strokeWidth={2}
                                                    d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                                                />
                                            </svg>
                                        )}
                                    </button>
                                    <button
                                        onClick={forward}
                                        className="text-[#B3B3B3] hover:text-[#1DB954] transform hover:scale-110 transition-all duration-300"
                                    >
                                        <svg
                                            xmlns="http://www.w3.org/2000/svg"
                                            className="h-6 w-6"
                                            fill="none"
                                            viewBox="0 0 24 24"
                                            stroke="currentColor"
                                        >
                                            <path
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                                strokeWidth={2}
                                                d="M11.933 12.8a1 1 0 000-1.6L6.6 7.2A1 1 0 005 8v8a1 1 0 001.6.8l5.333-4zM19.933 12.8a1 1 0 000-1.6l-5.333-4A1 1 0 0013 8v8a1 1 0 001.6.8l5.333-4z"
                                            />
                                        </svg>
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            );
        };

        export default LyricsModal;