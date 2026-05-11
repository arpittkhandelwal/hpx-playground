// HPX Playground — curated example library
window.HPX_EXAMPLES = [
  {
    category: '🚀 Getting Started',
    items: [
      {
        id: 'hello_world',
        label: 'Hello World',
        icon: '👋',
        doc: {
          title: 'HPX Hello World',
          tag: 'Beginner',
          body: 'The simplest HPX program. <code>hpx::cout</code> is a thread-safe replacement for <code>std::cout</code>. <code>hpx_main.hpp</code> automatically bootstraps the HPX runtime so you can use a plain <code>main()</code>.',
          snippet: '#include <hpx/hpx_main.hpp>\n#include <hpx/iostream.hpp>',
          link: 'https://hpx.dev/docs/latest/manual/getting_started.html',
        },
        code: `// Hello World — the simplest HPX program
#include <hpx/hpx_main.hpp>
#include <hpx/iostream.hpp>

int main()
{
    hpx::cout << "Hello from HPX!\\n"
              << "Running on " << hpx::get_num_worker_threads()
              << " worker thread(s)\\n"
              << std::flush;
    return 0;
}`,
      },
      {
        id: 'thread_info',
        label: 'Thread Info',
        icon: '🧵',
        doc: {
          title: 'HPX Thread Information',
          tag: 'Beginner',
          body: 'Query HPX runtime properties at startup — number of OS-threads, current thread ID, and locality information.',
          snippet: 'hpx::get_num_worker_threads()\nhpx::this_thread::get_id()',
        },
        code: `#include <hpx/hpx_main.hpp>
#include <hpx/iostream.hpp>
#include <hpx/thread.hpp>

int main()
{
    hpx::cout << "== HPX Runtime Info ==\\n";
    hpx::cout << "Worker threads : " << hpx::get_num_worker_threads() << "\\n";
    hpx::cout << "Thread id      : " << hpx::this_thread::get_id()    << "\\n";
    hpx::cout << std::flush;
    return 0;
}`,
      },
    ],
  },
  {
    category: '⚡ Async & Futures',
    items: [
      {
        id: 'basic_future',
        label: 'Basic Future',
        icon: '🔮',
        doc: {
          title: 'hpx::async & hpx::future',
          tag: 'Core API',
          body: '<code>hpx::async</code> launches a task asynchronously and returns a <code>hpx::future<T></code>. Call <code>.get()</code> to block and retrieve the result — just like <code>std::async</code> but with HPX\'s work-stealing scheduler.',
          snippet: 'hpx::future<int> f = hpx::async([]{ return 42; });\nint v = f.get();',
        },
        code: `#include <hpx/init.hpp>
#include <hpx/future.hpp>
#include <iostream>

int hpx_main()
{
    // Launch tasks asynchronously
    hpx::future<int> f1 = hpx::async([]{ return 6; });
    hpx::future<int> f2 = hpx::async([]{ return 7; });

    // Block and retrieve results
    int answer = f1.get() * f2.get();
    std::cout << "The answer is: " << answer << "\\n";

    return hpx::local::finalize();
}

int main(int argc, char* argv[])
{
    return hpx::local::init(hpx_main, argc, argv);
}`,
      },
      {
        id: 'future_continuation',
        label: 'Future Chaining (.then)',
        icon: '🔗',
        doc: {
          title: 'Future Continuations',
          tag: 'Async',
          body: '<code>future.then()</code> attaches a continuation that runs when the future is ready. Use <code>hpx::launch::async</code> to run on a new thread, or <code>hpx::launch::sync</code> to run inline.',
          snippet: 'auto f2 = f1.then(hpx::launch::async,\n  [](hpx::future<int> f){ return f.get()*2; });',
        },
        code: `#include <hpx/init.hpp>
#include <hpx/future.hpp>
#include <iostream>

int hpx_main()
{
    auto pipeline = hpx::async([]{ return 10; })
        .then([](hpx::future<int> f){
            std::cout << "Step 1: " << f.get() << "\\n";
            return f.get() * 2;
        })
        .then([](hpx::future<int> f){
            std::cout << "Step 2: " << f.get() << "\\n";
            return f.get() + 5;
        });

    std::cout << "Final:  " << pipeline.get() << "\\n";
    return hpx::local::finalize();
}

int main(int argc, char* argv[])
{
    return hpx::local::init(hpx_main, argc, argv);
}`,
      },
      {
        id: 'when_all',
        label: 'when_all / when_any',
        icon: '🕸️',
        doc: {
          title: 'hpx::when_all & hpx::when_any',
          tag: 'Async',
          body: '<code>hpx::when_all</code> creates a future that becomes ready when ALL input futures complete. <code>hpx::when_any</code> fires as soon as ANY one completes.',
          snippet: 'auto all = hpx::when_all(f1, f2, f3);\nall.get(); // waits for all',
        },
        code: `#include <hpx/init.hpp>
#include <hpx/future.hpp>
#include <iostream>
#include <vector>

int hpx_main()
{
    std::vector<hpx::future<int>> futures;
    for (int i = 0; i < 5; ++i)
        futures.push_back(hpx::async([i]{ return i * i; }));

    // Wait for all to complete
    auto all = hpx::when_all(futures);
    auto results = all.get();

    std::cout << "Squares: ";
    for (auto& f : results)
        std::cout << f.get() << " ";
    std::cout << "\\n";

    return hpx::local::finalize();
}

int main(int argc, char* argv[])
{
    return hpx::local::init(hpx_main, argc, argv);
}`,
      },
    ],
  },
  {
    category: '🔀 Parallel Algorithms',
    items: [
      {
        id: 'parallel_for_each',
        label: 'parallel for_each',
        icon: '🔄',
        doc: {
          title: 'hpx::for_each (Parallel)',
          tag: 'Parallel STL',
          body: 'Drop-in parallel replacement for <code>std::for_each</code>. Pass <code>hpx::execution::par</code> as the first argument to enable multi-threaded execution across the range.',
          snippet: 'hpx::for_each(hpx::execution::par,\n  v.begin(), v.end(), fn);',
        },
        code: `#include <hpx/algorithm.hpp>
#include <hpx/execution.hpp>
#include <hpx/init.hpp>
#include <iostream>
#include <vector>
#include <mutex>

int hpx_main()
{
    std::vector<int> v(10);
    std::iota(v.begin(), v.end(), 1);

    std::mutex mtx;

    // Sequential
    std::cout << "Sequential: ";
    hpx::for_each(v.begin(), v.end(),
        [](int n){ std::cout << n << " "; });
    std::cout << "\\n";

    // Parallel
    std::vector<int> doubled(10);
    hpx::transform(hpx::execution::par,
        v.begin(), v.end(), doubled.begin(),
        [](int n){ return n * 2; });

    std::cout << "Doubled (par): ";
    for (int x : doubled) std::cout << x << " ";
    std::cout << "\\n";

    return hpx::local::finalize();
}

int main(int argc, char* argv[])
{
    return hpx::local::init(hpx_main, argc, argv);
}`,
      },
      {
        id: 'parallel_sort',
        label: 'Parallel Sort',
        icon: '📊',
        doc: {
          title: 'hpx::sort (Parallel)',
          tag: 'Parallel STL',
          body: 'HPX provides a parallel <code>sort</code> that uses a divide-and-conquer strategy across HPX threads. Significant speedup on multi-core CPUs for large datasets.',
          snippet: 'hpx::sort(hpx::execution::par,\n  v.begin(), v.end());',
        },
        code: `#include <hpx/algorithm.hpp>
#include <hpx/execution.hpp>
#include <hpx/init.hpp>
#include <hpx/chrono.hpp>
#include <iostream>
#include <vector>
#include <random>

int hpx_main()
{
    const std::size_t N = 1'000'000;
    std::vector<int> data(N);

    std::mt19937 rng(42);
    std::generate(data.begin(), data.end(), rng);

    auto copy = data;

    // Sequential sort
    hpx::chrono::high_resolution_timer t1;
    std::sort(copy.begin(), copy.end());
    double seq_ms = t1.elapsed() * 1000;

    // Parallel sort
    hpx::chrono::high_resolution_timer t2;
    hpx::sort(hpx::execution::par, data.begin(), data.end());
    double par_ms = t2.elapsed() * 1000;

    std::cout << "N = " << N << "\\n";
    std::cout << "Sequential: " << seq_ms << " ms\\n";
    std::cout << "Parallel:   " << par_ms << " ms\\n";
    std::cout << "Sorted correctly: "
              << std::boolalpha << (data == copy) << "\\n";

    return hpx::local::finalize();
}

int main(int argc, char* argv[])
{
    return hpx::local::init(hpx_main, argc, argv);
}`,
      },
      {
        id: 'parallel_reduce',
        label: 'Parallel Reduce',
        icon: '➕',
        doc: {
          title: 'hpx::reduce (Parallel)',
          tag: 'Parallel STL',
          body: '<code>hpx::reduce</code> is the parallel version of <code>std::reduce</code>. The reduction operation must be commutative and associative to allow parallel evaluation.',
          snippet: 'double sum = hpx::reduce(hpx::execution::par,\n  v.begin(), v.end(), 0.0);',
        },
        code: `#include <hpx/algorithm.hpp>
#include <hpx/numeric.hpp>
#include <hpx/execution.hpp>
#include <hpx/init.hpp>
#include <iostream>
#include <vector>
#include <numeric>

int hpx_main()
{
    const std::size_t N = 10'000'000;
    std::vector<double> v(N, 1.0);

    // Parallel sum
    double sum = hpx::reduce(
        hpx::execution::par, v.begin(), v.end(), 0.0);

    // Parallel inner product
    std::vector<double> weights(N, 0.5);
    double dot = hpx::transform_reduce(
        hpx::execution::par,
        v.begin(), v.end(), weights.begin(),
        0.0, std::plus<>{}, std::multiplies<>{});

    std::cout << "Sum of " << N << " ones: " << sum << "\\n";
    std::cout << "Dot product (w=0.5):    " << dot  << "\\n";

    return hpx::local::finalize();
}

int main(int argc, char* argv[])
{
    return hpx::local::init(hpx_main, argc, argv);
}`,
      },
    ],
  },
  {
    category: '🧵 Synchronization',
    items: [
      {
        id: 'mutex_example',
        label: 'Mutex & Locking',
        icon: '🔒',
        doc: {
          title: 'hpx::mutex',
          tag: 'Sync',
          body: '<code>hpx::mutex</code> is a cooperative, fiber-aware mutex. When a thread blocks on a lock, the HPX scheduler runs other tasks — far more efficient than OS-level blocking.',
          snippet: 'hpx::mutex mtx;\n{\n  std::scoped_lock lk(mtx);\n  // critical section\n}',
        },
        code: `#include <hpx/init.hpp>
#include <hpx/mutex.hpp>
#include <hpx/future.hpp>
#include <iostream>
#include <vector>

hpx::mutex g_mutex;
int g_counter = 0;

int hpx_main()
{
    std::vector<hpx::future<void>> tasks;

    for (int i = 0; i < 20; ++i)
        tasks.push_back(hpx::async([]{
            std::scoped_lock lk(g_mutex);
            ++g_counter;
        }));

    hpx::wait_all(tasks);
    std::cout << "Counter (expected 20): " << g_counter << "\\n";

    return hpx::local::finalize();
}

int main(int argc, char* argv[])
{
    return hpx::local::init(hpx_main, argc, argv);
}`,
      },
      {
        id: 'channel_example',
        label: 'Local Channel',
        icon: '📡',
        doc: {
          title: 'hpx::local::channel',
          tag: 'Sync',
          body: 'HPX channels implement CSP-style message passing. A sender sets values and a receiver gets futures. Great for producer-consumer pipelines.',
          snippet: 'hpx::local::channel<int> ch(1);\nch.set(42);\nint v = ch.get().get();',
        },
        code: `#include <hpx/init.hpp>
#include <hpx/channel.hpp>
#include <hpx/future.hpp>
#include <iostream>

int hpx_main()
{
    hpx::local::channel<int> ch(1);

    // Producer
    auto producer = hpx::async([&ch]{
        for (int i = 1; i <= 5; ++i) {
            std::cout << "Sending: " << i << "\\n";
            ch.set(i);
        }
        ch.close();
    });

    // Consumer
    auto consumer = hpx::async([&ch]{
        int val;
        while (ch.get()
                .then([&val](hpx::future<int> f){
                    val = f.get(); return true;
                }).get())
        {
            std::cout << "Received: " << val << "\\n";
        }
    });

    producer.get();
    consumer.get();
    return hpx::local::finalize();
}

int main(int argc, char* argv[])
{
    return hpx::local::init(hpx_main, argc, argv);
}`,
      },
    ],
  },
  {
    category: '🔢 Scientific Computing',
    items: [
      {
        id: 'matrix_mult',
        label: 'Matrix Multiplication',
        icon: '🧮',
        doc: {
          title: 'Parallel Matrix Multiplication',
          tag: 'HPC',
          body: 'Uses <code>hpx::experimental::for_loop</code> with <code>hpx::execution::par</code> to parallelize the outer loop of matrix multiplication across all available cores.',
          snippet: 'hpx::experimental::for_loop(\n  hpx::execution::par, 0, N,\n  [&](auto i){ /* row i */ });',
        },
        code: `#include <hpx/algorithm.hpp>
#include <hpx/execution.hpp>
#include <hpx/experimental/for_loop.hpp>
#include <hpx/init.hpp>
#include <iostream>
#include <vector>

int hpx_main()
{
    const std::size_t N = 64;
    std::vector<double> A(N*N, 1.0);
    std::vector<double> B(N*N, 2.0);
    std::vector<double> C(N*N, 0.0);

    // Parallel matrix multiply
    hpx::experimental::for_loop(
        hpx::execution::par, 0, N, [&](std::size_t i) {
            for (std::size_t j = 0; j < N; ++j) {
                double sum = 0.0;
                for (std::size_t k = 0; k < N; ++k)
                    sum += A[i*N+k] * B[k*N+j];
                C[i*N+j] = sum;
            }
        });

    // Verify: every element should be N*1.0*2.0 = 128
    std::cout << "C[0,0]  = " << C[0]        << "  (expected " << N*2 << ")\\n";
    std::cout << "C[N-1,N-1] = " << C[N*N-1] << "  (expected " << N*2 << ")\\n";

    return hpx::local::finalize();
}

int main(int argc, char* argv[])
{
    return hpx::local::init(hpx_main, argc, argv);
}`,
      },
      {
        id: 'stencil',
        label: '1D Heat Stencil',
        icon: '🌡️',
        doc: {
          title: '1D Heat Equation Stencil',
          tag: 'Scientific',
          body: 'A classic HPC stencil computation. Each cell\'s new value depends on its neighbors. HPX parallelizes the update sweep using <code>hpx::transform</code> with par execution.',
          snippet: 'hpx::transform(hpx::execution::par,\n  src.begin()+1, src.end()-1,\n  dst.begin()+1, update_fn);',
        },
        code: `#include <hpx/algorithm.hpp>
#include <hpx/execution.hpp>
#include <hpx/init.hpp>
#include <iostream>
#include <vector>
#include <cmath>

int hpx_main()
{
    const std::size_t NX = 256, STEPS = 100;
    const double k = 0.25; // diffusion coeff

    std::vector<double> u(NX, 0.0), u_new(NX);

    // Initial condition: Gaussian pulse
    for (std::size_t i = 0; i < NX; ++i) {
        double x = (double)i / NX;
        u[i] = std::exp(-200.0 * (x-0.5)*(x-0.5));
    }

    for (std::size_t t = 0; t < STEPS; ++t) {
        u_new.front() = u.front();
        u_new.back()  = u.back();

        // Parallel stencil sweep
        hpx::experimental::for_loop(
            hpx::execution::par, 1UL, NX-1, [&](std::size_t i){
                u_new[i] = u[i] + k * (u[i-1] - 2*u[i] + u[i+1]);
            });
        std::swap(u, u_new);
    }

    double max_val = *std::max_element(u.begin(), u.end());
    std::cout << "After " << STEPS << " steps, max temp = " << max_val << "\\n";

    return hpx::local::finalize();
}

int main(int argc, char* argv[])
{
    return hpx::local::init(hpx_main, argc, argv);
}`,
      },
      {
        id: 'fibonacci',
        label: 'Async Fibonacci',
        icon: '🔁',
        doc: {
          title: 'Fibonacci with Futures',
          tag: 'Recursion',
          body: 'Demonstrates task-based parallelism via recursive <code>hpx::async</code> calls. HPX\'s work-stealing scheduler efficiently manages the task graph.',
          snippet: 'hpx::future<uint64_t> n1 = hpx::async(fib, n-1);\nhpx::future<uint64_t> n2 = hpx::async(fib, n-2);\nreturn n1.get() + n2.get();',
        },
        code: `#include <hpx/init.hpp>
#include <hpx/future.hpp>
#include <iostream>
#include <cstdint>

std::uint64_t fib(std::uint64_t n)
{
    if (n < 2) return n;

    // Spawn two tasks in parallel
    hpx::future<std::uint64_t> n1 = hpx::async(fib, n-1);
    hpx::future<std::uint64_t> n2 = hpx::async(fib, n-2);

    return n1.get() + n2.get();
}

int hpx_main()
{
    for (std::uint64_t i = 1; i <= 15; ++i)
        std::cout << "fib(" << i << ") = " << fib(i) << "\\n";

    return hpx::local::finalize();
}

int main(int argc, char* argv[])
{
    return hpx::local::init(hpx_main, argc, argv);
}`,
      },
    ],
  },
];
