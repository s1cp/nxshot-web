import type { NextPage } from "next";
import Head from "next/head";
import { useEffect, useState } from "react";
import gameids from "../data/gameids.json";

import {
  isChromium,
  isChrome,
  isOpera,
  isEdge,
  isEdgeChromium
} from "react-device-detect";

import {
  CameraIcon,
  CheckIcon,
  DocumentIcon,
  FolderDownloadIcon,
  FolderIcon,
  FolderOpenIcon
} from "@heroicons/react/solid";

interface GameIds {
  [key: string]: string;
}

type ScreenshotProps = {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
  gameid: string;
  gamename: string;
};

async function* getFilesRecursively(
  entry: FileSystemDirectoryHandle | FileSystemFileHandle
): AsyncGenerator<FileSystemFileHandle> {
  if (entry.kind === "file") {
    const file = await entry.getFile();
    if (file !== null) {
      yield entry;
    }
  } else if (entry.kind === "directory" && entry.name !== "Organized") {
    for await (const handle of entry.values()) {
      yield* getFilesRecursively(handle);
    }
  }
}

const Home: NextPage = () => {
  const [isCompatible, setIsCompatible] = useState(false);
  const [albumDirectory, setAlbumDirectory] =
    useState<FileSystemDirectoryHandle>();
  const [files, setFiles] = useState<FileSystemFileHandle[]>([]);
  const [currentFileIndex, setCurrentFileIndex] = useState(0);

  useEffect(() => {
    setIsCompatible(
      isChromium || isChrome || isOpera || isEdge || isEdgeChromium
    );
  }, []);

  async function handleLoad() {
    const dirHandle = await window.showDirectoryPicker().catch((e) => {
      if (e.name === "AbortError") return;
    });

    if (!dirHandle) return;

    setAlbumDirectory(dirHandle);

    const filesArray: FileSystemFileHandle[] = [];

    for await (const fileHandle of getFilesRecursively(dirHandle)) {
      filesArray.push(fileHandle);
    }

    const picturesArray = filesArray.filter(
      (file) => file.name.length == 53 && file.name.endsWith(".jpg")
    );
    const videosArray = filesArray.filter(
      (file) => file.name.length == 53 && file.name.endsWith(".mp4")
    );

    setFiles([...picturesArray, ...videosArray]);
    setCurrentFileIndex(0);
  }

  async function handleSave() {
    if (!albumDirectory) return;

    console.log("Saving album");

    const organizedDirectory = await albumDirectory.getDirectoryHandle(
      "Organized",
      {
        create: true
      }
    );

    const gameidsObject: GameIds = gameids;
    let fileIndex = 0;

    for await (const file of files) {
      const screenshot: ScreenshotProps = {
        year: +file.name.substring(0, 4),
        month: +file.name.substring(4, 6) - 1,
        day: +file.name.substring(6, 8),
        hour: +file.name.substring(8, 10),
        minute: +file.name.substring(10, 12),
        second: +file.name.substring(12, 14),
        gameid: file.name.substring(17, 49),
        gamename: gameidsObject[file.name.substring(17, 49)] ?? "Unknown"
      };

      // const dateTime = new Date(
      //   screenshot.year,
      //   screenshot.month,
      //   screenshot.day,
      //   screenshot.hour,
      //   screenshot.minute,
      //   screenshot.second
      // );

      // const posix_timestamp = dateTime.getTime();

      const gameDirectoryHandle = await organizedDirectory.getDirectoryHandle(
        screenshot.gamename,
        {
          create: true
        }
      );

      const new_file = await gameDirectoryHandle.getFileHandle(file.name, {
        create: true
      });

      const new_file_writer = await new_file.createWritable();
      await new_file_writer.write(await file.getFile());
      await new_file_writer.close();

      fileIndex++;
      setCurrentFileIndex(fileIndex);
    }
  }

  return (
    <>
      <Head>
        <title>nxshot</title>
        <meta
          name="description"
          content="Nintendo Switch screenshot organizer"
        />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <main className="container mx-auto flex flex-col items-center justify-center min-h-screen p-4">
        <div className="flex flex-row items-center justify-center">
          <CameraIcon className="w-10 h-10 mt-2 mr-1 md:w-16 md:h-16 md:mt-4 md:mr-2 text-gray-800 dark:text-gray-300" />
          <h1 className="text-5xl md:text-[5rem] leading-normal font-extrabold text-gray-800 dark:text-gray-300">
            <span className="text-red-600">nx</span>shot
          </h1>
        </div>

        <p className="text-2xl text-gray-800 dark:text-gray-300 text-center">
          Automatically organize your Nintendo Switch captures
        </p>

        <div className="flex flex-col justify-items-center align-middle justify-center mt-8">
          {isCompatible ? (
            <button
              onClick={handleLoad}
              className="dark:text-gray-900 text-gray-100 font-bold dark:bg-gray-300 bg-gray-700 dark:hover:bg-gray-400 hover:bg-gray-800 dark:active:bg-gray-500 active:bg-gray-900 focus:outline-none focus:ring dark:focus:ring-gray-100 focus:ring-gray-500 py-2 px-4 drop-shadow-xl rounded-md inline-flex items-center"
            >
              <FolderIcon className="w-6 h-6 mr-2" />
              <span>Select folder...</span>
            </button>
          ) : (
            <p className="text-gray-600 text-center">
              Your browser is not supported. Please use a compatible browser.
            </p>
          )}
        </div>

        {files.length > 0 && (
          <>
            {/* <div className="container flex flex-col justify-items-center align-middle justify-center mt-8">
            {files.map((file) => (
                <div key={file.name} className="flex flex-row justify-items-center align-middle justify-center mt-4">
                  <FolderIcon className="w-6 h-6 mr-2 text-gray-100" />
                  <span className="text-gray-600">{file.name}</span>
                </div>
              ))}
            </div> */}

            <div className="flex flex-row justify-items-center align-middle justify-center mt-8">
              <DocumentIcon className="w-6 h-6 mr-2 text-gray-800 dark:text-gray-300" />
              <p className="text-gray-600 text-center">
                {currentFileIndex === 0 && <>{files.length} files found</>}
                {currentFileIndex > 0 && currentFileIndex < files.length && (
                  <>
                    File {currentFileIndex} of {files.length}
                  </>
                )}
                {currentFileIndex === files.length && <>All files processed</>}
              </p>
            </div>

            {currentFileIndex !== files.length && (
              <div className="flex flex-col justify-items-center align-middle justify-center mt-8">
                <button
                  onClick={handleSave}
                  className="inline-flex items-center py-2 px-4
                          drop-shadow-xl rounded-md
                          text-gray-100 font-bold
                          bg-red-600 hover:bg-red-700 
                          active:bg-red-800 focus:ring-red-400
                          focus:outline-none focus:ring"
                >
                  <FolderDownloadIcon className="w-6 h-6 mr-2" />
                  <span>Organize</span>
                </button>
              </div>
            )}
            {currentFileIndex === files.length && (
              <div className="flex flex-col justify-items-center align-middle justify-center mt-8">
                <button
                  disabled
                  className="inline-flex items-center py-2 px-4
                        drop-shadow-xl rounded-md
                        text-gray-100 font-bold
                        bg-green-600"
                >
                  <CheckIcon className="w-6 h-6 mr-2" />
                  <span>Done!</span>
                </button>
              </div>
            )}
          </>
        )}

        <footer className="mt-8">
          <p className="text-gray-600 text-center">
            <span className="text-red-600">nx</span>shot is a{" "}
            <a
              href="https://github.com/s1cp/nxshot-web"
              target="_blank"
              className="underline"
            >
              work in progress
            </a>
            .
          </p>
        </footer>
      </main>
    </>
  );
};

export default Home;
