const backendOrigin = window.location.origin.replace(/:\d+$/, ':8000');

export const fetchGridData = async () => {
    try {
        const response = await fetch(`/api/grid`, {
            method: "GET",
            headers: { "Content-Type": "application/json" },
            mode: "cors",
        });
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        return data;
    } catch (error) {
        console.error("Error fetching grid:", error);
        throw error; // Rethrow the error to be handled by the caller
    }
};

export const submitWord = async (wordData) => {
    try {
        const response = await fetch("/api/submit_word", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(wordData)
        });
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const result = await response.json();
        return result;
    } catch (error) {
        console.error("Error submitting word:", error);
        throw error;
    }
};