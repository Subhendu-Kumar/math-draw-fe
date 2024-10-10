import axios from "axios";
import { BASE_URL } from "./config";
import { motion } from "framer-motion";
import ColorPicker from "react-pick-color";
import { TbMathFunction } from "react-icons/tb";
import toast, { Toaster } from "react-hot-toast";
import { useEffect, useRef, useState } from "react";

const App = () => {
  const ref = useRef(null);
  const canvasRef = useRef(null);
  const [reset, setReset] = useState(false);
  const [color, setColor] = useState("#fff");
  const [result, setResult] = useState(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [dictOfVariables, setDictOfVariables] = useState({});
  const [latexExpression, setLatexExpression] = useState([]);
  const [firstVisit, setFirstVisit] = useState(false);
  const [latexPosition, setLatexPosition] = useState({ x: 10, y: 200 });

  const getCanvasCoordinates = (e) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
  };

  const startDrawing = (e) => {
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext("2d");
      if (ctx) {
        const { x, y } = getCanvasCoordinates(e);
        ctx.beginPath();
        ctx.moveTo(x, y);
        setIsDrawing(true);
      }
    }
  };

  const draw = (e) => {
    if (!isDrawing) {
      return;
    }
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext("2d");
      if (ctx) {
        const { x, y } = getCanvasCoordinates(e);
        ctx.strokeStyle = color;
        ctx.lineTo(x, y);
        ctx.stroke();
      }
    }
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const resetCanvas = () => {
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      }
    }
  };

  const sendData = async () => {
    const toastId = toast.loading("Evaluating...");
    const canvas = canvasRef.current;
    try {
      if (canvas) {
        const response = await axios.post(`${BASE_URL}/evaluate`, {
          image: canvas.toDataURL("image/png"),
          dict_of_vars: dictOfVariables,
        });
        const res = await response.data;
        res.data.forEach((item) => {
          if (item.assign === true) {
            setDictOfVariables((prev) => ({
              ...prev,
              [item.expr]: item.result,
            }));
          }
        });
        const ctx = canvas.getContext("2d");
        if (ctx) {
          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          let minX = canvas.width,
            minY = canvas.height,
            maxX = 0,
            maxY = 0;
          for (let y = 0; y < canvas.height; y++) {
            for (let x = 0; x < canvas.width; x++) {
              const i = (y * canvas.width + x) * 4;
              if (imageData.data[i + 3] > 0) {
                minX = Math.min(minX, x);
                minY = Math.min(minY, y);
                maxX = Math.max(maxX, x);
                maxY = Math.max(maxY, y);
              }
            }
          }
          const centerX = (minX + maxX) / 2;
          const centerY = (minY + maxY) / 2;
          setLatexPosition({ x: centerX, y: centerY });
          if (res.data) {
            res.data.forEach((data) => {
              setTimeout(() => {
                setResult({
                  expression: data.expr,
                  answer: data.result,
                });
              }, 1000);
            });
          }
        }
      }
      toast.success("Evaluation successful", {
        id: toastId,
      });
    } catch (error) {
      console.error(error.message);
      toast.error("Error in evaluation the expression", {
        id: toastId,
      });
    }
  };

  const renderLatexToCanvas = (expression, answer) => {
    const latex = `${expression} = ${answer}`;
    setLatexExpression((prev) => [...prev, latex]);
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      }
    }
  };

  useEffect(() => {
    setFirstVisit(true);
  }, []);

  useEffect(() => {
    if (latexExpression.length > 0 && window.MathJax) {
      setTimeout(() => {
        window.MathJax.Hub.Queue(["Typeset", window.MathJax.Hub]);
      }, 0);
    }
  }, [latexExpression]);

  useEffect(() => {
    if (result) {
      renderLatexToCanvas(result.expression, result.answer);
    }
  }, [result]);

  useEffect(() => {
    const script = document.createElement("script");
    script.src =
      "https://cdnjs.cloudflare.com/ajax/libs/mathjax/2.7.9/config/TeX-MML-AM_CHTML.min.js";
    script.async = true;
    document.head.appendChild(script);
    script.onload = () => {
      window.MathJax.Hub.Config({
        tex2jax: {
          inlineMath: [
            ["$", "$"],
            ["\\(", "\\)"],
          ],
        },
      });
    };
    return () => {
      document.head.removeChild(script);
    };
  }, []);

  useEffect(() => {
    if (reset) {
      resetCanvas();
      setLatexExpression([]);
      setResult(null);
      setDictOfVariables({});
      setReset(false);
    }
  }, [reset]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext("2d");
      if (ctx) {
        const handleResize = () => {
          canvas.width = window.innerWidth * 0.78;
          canvas.height = window.innerHeight;
          ctx.lineCap = "round";
          ctx.lineJoin = "round";
          ctx.lineWidth = 5;
        };
        handleResize();
        window.addEventListener("resize", handleResize);
        return () => window.removeEventListener("resize", handleResize);
      }
    }
  }, []);

  return (
    <div className="w-full h-screen bg-gray-200 flex items-center justify-center">
      {firstVisit && (
        <div className="fixed inset-0 bg-black bg-opacity-85 z-50 flex items-center justify-center">
          <div className="w-[50%] h-auto p-6 bg-white rounded-md">
            <h1 className="text-2xl font-bold text-gray-500">
              Welcome to Math Draw
            </h1>
            <p className="text-base text-gray-500 leading-none mt-2">
              Math Draw is a tool that allows you to draw mathematical
              expressions and equations on a canvas and evaluate them.
            </p>
            <p className="text-sm text-gray-500 leading-none mt-2">
              <span className="text-red-500">Note!</span> this may will not work
              for expressions which are not properply drawen
            </p>
            <div className="w-full h-auto flex items-center justify-between mt-10">
              <p className="text-sm text-gray-500 leading-none">
                Created by :{" "}
                <a
                  href="https://github.com/Subhendu-Kumar"
                  target="_blank"
                  className="text-purple-500 font-semibold underline"
                >
                  Subhendu Kumar
                </a>
              </p>
              <button
                className="w-fit h-auto px-3 py-1 bg-purple-200 hover:bg-purple-300 transition-all duration-300 ease-in-out rounded-md text-sm text-black font-semibold"
                onClick={() => setFirstVisit(false)}
              >
                Continue to app
              </button>
            </div>
          </div>
        </div>
      )}
      <div className="w-[22%] h-full border-r-2 border-gray-300 p-4 flex items-start justify-between flex-col">
        <div className="w-full h-full">
          <div className="w-full h-auto flex items-center justify-start gap-3 text-3xl font-bold text-gray-500 select-none border-b-2 border-gray-300 pb-3">
            <TbMathFunction />
            <h1>Math Draw</h1>
          </div>
          <div className="w-full h-auto flex flex-col items-start justify-center gap-3 mt-6 select-none">
            <h1>Choose pen color</h1>
            <ColorPicker
              color={color}
              onChange={(color) => setColor(color.hex)}
              theme={{
                background: "lightgrey",
                inputBackground: "grey",
                borderColor: "darkgrey",
                borderRadius: "8px",
                color: "black",
                width: "100%",
              }}
            />
          </div>
          <div className="w-full h-auto flex flex-col items-center justify-center gap-3 mt-6 select-none">
            <button
              className="w-full h-10 bg-gray-300 hover:bg-gray-400 transition-all duration-300 ease-in-out rounded-md"
              onClick={() => setReset(true)}
            >
              Reset canvas
            </button>
            <button
              className="w-full h-10 bg-gray-300 hover:bg-gray-400 transition-all duration-300 ease-in-out rounded-md"
              onClick={sendData}
            >
              Evaluate
            </button>
          </div>
        </div>
        <div className="w-full h-auto text-base font-semibold">
          &copy; 2024 Math Draw | Subhendu Kumar
        </div>
      </div>
      <div className="w-[78%] h-full relative" ref={ref}>
        <canvas
          ref={canvasRef}
          id="canvas"
          className="w-full h-full absolute top-0 left-0"
          onMouseDown={startDrawing}
          onMouseUp={stopDrawing}
          onMouseMove={draw}
        />
        {latexExpression &&
          latexExpression.map((latex, index) => (
            <motion.div
              key={index}
              drag
              dragConstraints={ref}
              whileDrag={{ scale: 1.2 }}
              dragElastic={0.1}
              position={latexPosition}
              onDragEnd={(e, data) =>
                setLatexPosition({ x: data.x, y: data.y })
              }
            >
              <div className="absolute text-lg font-semibold text-green-500">
                <div className="latex-content">{latex}</div>
              </div>
            </motion.div>
          ))}
      </div>
      <Toaster />
    </div>
  );
};

export default App;
