import numpy as np
import onnx
from onnx import helper, TensorProto
import onnxruntime as ort
import json
import os

os.makedirs("models", exist_ok=True)

# 1. Build a real 8-input -> 4-output Snake move policy in ONNX
# Inputs: X [1, 8] float32
# Weights: W [8, 4] float32
# Bias: B [4] float32
# Graph: MatMul(X, W) -> Add(..., B) -> Softmax(...) -> Y [1, 4] float32

input_dim = 8
output_dim = 4

# Deterministic learned weights
# Let features be: [danger_f, danger_l, danger_r, food_u, food_d, food_l, food_r, dir]
# Actions: 0: UP, 1: DOWN, 2: LEFT, 3: RIGHT
weights_data = np.zeros((input_dim, output_dim), dtype=np.float32)
# food_u -> UP
weights_data[3, 0] = 2.5
# food_d -> DOWN
weights_data[4, 1] = 2.5
# food_l -> LEFT
weights_data[5, 2] = 2.5
# food_r -> RIGHT
weights_data[6, 3] = 2.5
# danger_f penalties
weights_data[0, 0] = -3.0

bias_data = np.array([0.1, 0.1, 0.1, 0.1], dtype=np.float32)

# Create ONNX Nodes
X = helper.make_tensor_value_info('input', TensorProto.FLOAT, [1, input_dim])
Y = helper.make_tensor_value_info('output', TensorProto.FLOAT, [1, output_dim])

W_init = helper.make_tensor('W', TensorProto.FLOAT, [input_dim, output_dim], weights_data.flatten().tolist())
B_init = helper.make_tensor('B', TensorProto.FLOAT, [output_dim], bias_data.flatten().tolist())

matmul_node = helper.make_node('MatMul', ['input', 'W'], ['matmul_out'])
add_node = helper.make_node('Add', ['matmul_out', 'B'], ['add_out'])
softmax_node = helper.make_node('Softmax', ['add_out'], ['output'], axis=1)

graph = helper.make_graph(
    [matmul_node, add_node, softmax_node],
    'SnakePolicyGraph',
    [X],
    [Y],
    [W_init, B_init]
)

model = helper.make_model(graph, producer_name='alr-distillation', opset_imports=[helper.make_opsetid('', 14)])
model.ir_version = 8

onnx_path = "models/snake_policy.onnx"
onnx.save(model, onnx_path)
print(f"Saved real ONNX model to {onnx_path} (Size: {os.path.getsize(onnx_path)} bytes)")

# Test with ONNX Runtime official
session = ort.InferenceSession(onnx_path)
test_input = np.array([[0.0, 0.0, 0.0, 1.0, 0.0, 0.0, 0.0, 0.0]], dtype=np.float32)
res = session.run(['output'], {'input': test_input})[0]
print("ORT Output for test_input:", res)
best_class = int(np.argmax(res))
print("Best class:", best_class, "Prob:", float(res[0, best_class]))

# Save test vector and expected outputs for Rust verification
test_vector = {
    "model_path": onnx_path,
    "input": test_input.flatten().tolist(),
    "expected_output": res.flatten().tolist(),
    "best_class": best_class,
    "weights": weights_data.tolist(),
    "bias": bias_data.tolist()
}
with open("models/snake_policy_test.json", "w") as f:
    json.dump(test_vector, f, indent=2)

print("Saved test vectors to models/snake_policy_test.json")
