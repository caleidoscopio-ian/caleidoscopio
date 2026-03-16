const markdownpdf = require("markdown-pdf");

const options = {
  paperFormat: "A4",
  paperOrientation: "portrait",
  paperBorder: "2cm",
  remarkable: {
    html: true,
    breaks: true,
  },
};

// Pegar argumentos da linha de comando
const inputFile = process.argv[2] || "ESCOPO.md";
const outputFile = process.argv[3] || inputFile.replace(".md", ".pdf");

markdownpdf(options)
  .from(inputFile)
  .to(outputFile, function () {
    console.log(`✅ PDF gerado com sucesso: ${outputFile}`);
  });
